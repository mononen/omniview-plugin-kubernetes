package resource

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"

	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
)

// nativeSchemaDocument keeps the exact OpenAPI document and its native root.
// It does not normalize dialects, rewrite references, or claim validation.
// All types from one group/version share the same bounded document bytes.
type nativeSchemaDocument struct {
	Document json.RawMessage
	Root     string
	Revision string
}

const maxNativeSchemaBytes = 16 << 20
const maxNativeRetainedSchemaBytes = 32 << 20

// nativeSchemaBudget bounds retained document bytes across every connection on
// one provider. Fetches serialize staging, so only one bounded document is
// decoded at a time. The zero value uses the production limit.
type nativeSchemaBudget struct {
	// Accounting never holds mu during network reads or decoding.
	mu      sync.Mutex
	staging chan struct{}
	limit   int
	used    int
}

// nativeSchemaLease belongs to one catalog snapshot. Release it on failed
// publication, replacement, or connection teardown, after dropping its cache.
type nativeSchemaLease struct {
	budget *nativeSchemaBudget
	bytes  int
}

func (l *nativeSchemaLease) Release() {
	if l == nil {
		return
	}
	l.budget.mu.Lock()
	defer l.budget.mu.Unlock()
	l.budget.used -= l.bytes
	l.bytes = 0
}

func fetchNativeSchemas(ctx context.Context, client rest.Interface, bindings map[string]nativeType, budget *nativeSchemaBudget) (map[string]nativeSchemaDocument, map[string]error, *nativeSchemaLease) {
	budget.mu.Lock()
	if budget.staging == nil {
		budget.staging = make(chan struct{}, 1)
	}
	staging := budget.staging
	limit := budget.limit
	if limit == 0 {
		limit = maxNativeRetainedSchemaBytes
	}
	budget.mu.Unlock()
	lease := &nativeSchemaLease{budget: budget}
	select {
	case staging <- struct{}{}:
		defer func() { <-staging }()
	case <-ctx.Done():
		failures := make(map[string]error, len(bindings))
		for token := range bindings {
			failures[token] = ctx.Err()
		}
		return map[string]nativeSchemaDocument{}, failures, lease
	}
	byGroup := make(map[schema.GroupVersion][]string)
	for token, binding := range bindings {
		gv := binding.GVR.GroupVersion()
		byGroup[gv] = append(byGroup[gv], token)
	}
	result := make(map[string]nativeSchemaDocument, len(bindings))
	failures := make(map[string]error)
	groups := make([]schema.GroupVersion, 0, len(byGroup))
	for gv := range byGroup {
		groups = append(groups, gv)
	}
	sort.Slice(groups, func(i, j int) bool { return groups[i].String() < groups[j].String() })
	for _, gv := range groups {
		tokens := byGroup[gv]
		if err := ctx.Err(); err != nil {
			for _, token := range tokens {
				failures[token] = err
			}
			continue
		}
		path := "/openapi/v3/apis/" + gv.Group + "/" + gv.Version
		if gv.Group == "" {
			path = "/openapi/v3/api/" + gv.Version
		}
		budget.mu.Lock()
		// Staging excludes other fetches. Concurrent releases can only increase
		// this allowance before the document is charged.
		remaining := limit - budget.used
		budget.mu.Unlock()
		if remaining <= 0 {
			for _, token := range tokens {
				failures[token] = fmt.Errorf("native OpenAPI retained schema budget exhausted (%d bytes)", limit)
			}
			continue
		}
		data, err := readNativeSchema(ctx, client, path, remaining)
		if err != nil {
			for _, token := range tokens {
				failures[token] = err
			}
			continue
		}
		if err := resourcev2.ValidateJSON(data); err != nil {
			for _, token := range tokens {
				failures[token] = err
			}
			continue
		}
		var document struct {
			Components struct {
				Schemas map[string]json.RawMessage `json:"schemas"`
			} `json:"components"`
		}
		if err := json.Unmarshal(data, &document); err != nil {
			for _, token := range tokens {
				failures[token] = fmt.Errorf("invalid native OpenAPI document: %w", err)
			}
			continue
		}
		digest := sha256.Sum256(data)
		revision := hex.EncodeToString(digest[:])
		roots := make(map[schema.GroupVersionKind]string)
		ambiguous := make(map[schema.GroupVersionKind]bool)
		for name, body := range document.Components.Schemas {
			var descriptor struct {
				Kinds []struct {
					Group   string `json:"group"`
					Version string `json:"version"`
					Kind    string `json:"kind"`
				} `json:"x-kubernetes-group-version-kind"`
			}
			if err := json.Unmarshal(body, &descriptor); err != nil {
				continue
			}
			root := "#/components/schemas/" + escapeJSONPointer(name)
			for _, kind := range descriptor.Kinds {
				key := schema.GroupVersionKind{Group: kind.Group, Version: kind.Version, Kind: kind.Kind}
				if prior, exists := roots[key]; exists && prior != root {
					ambiguous[key] = true
				}
				roots[key] = root
			}
		}
		retained := false
		for _, token := range tokens {
			binding := bindings[token]
			key := gv.WithKind(binding.API.Kind)
			if ambiguous[key] {
				failures[token] = fmt.Errorf("ambiguous native OpenAPI root for %q", token)
				continue
			}
			root := roots[key]
			if root == "" {
				failures[token] = fmt.Errorf("native OpenAPI root unavailable for %q", token)
				continue
			}
			if !retained {
				// ReadAll may leave spare capacity. Keep exactly the charged bytes;
				// all type entries below share this single document allocation.
				if cap(data) != len(data) {
					exact := make([]byte, len(data))
					copy(exact, data)
					data = exact
				}
				budget.mu.Lock()
				budget.used += len(data)
				lease.bytes += len(data)
				budget.mu.Unlock()
				retained = true
			}
			result[token] = nativeSchemaDocument{Document: data, Root: root, Revision: revision}
		}
	}
	return result, failures, lease
}

func readNativeSchema(ctx context.Context, client rest.Interface, path string, remaining int) ([]byte, error) {
	stream, err := client.Get().AbsPath(path).Stream(ctx)
	if err != nil {
		return nil, err
	}
	defer stream.Close()
	limit := maxNativeSchemaBytes
	if remaining < limit {
		limit = remaining
	}
	data, err := io.ReadAll(io.LimitReader(stream, int64(limit)+1))
	if err != nil {
		return nil, err
	}
	if len(data) > limit {
		if remaining < maxNativeSchemaBytes {
			return nil, fmt.Errorf("native OpenAPI retained schema budget exhausted (%d bytes available)", remaining)
		}
		return nil, fmt.Errorf("native OpenAPI document exceeds %d bytes", maxNativeSchemaBytes)
	}
	return data, ctx.Err()
}

func escapeJSONPointer(value string) string {
	return strings.ReplaceAll(strings.ReplaceAll(value, "~", "~0"), "/", "~1")
}
