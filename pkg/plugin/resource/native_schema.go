package resource

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
)

// nativeSchemaDocument keeps the exact OpenAPI document and its native root.
// It does not normalize dialects, rewrite references, or claim validation.
// All types from one group/version share the same bounded document bytes.
type nativeSchemaDocument struct {
	Document json.RawMessage
	Root string
	Revision string
}

const maxNativeSchemaBytes = 16 << 20

func fetchNativeSchemas(ctx context.Context, client rest.Interface, bindings map[string]nativeType) (map[string]nativeSchemaDocument, map[string]error) {
	byGroup := make(map[schema.GroupVersion][]string)
	for token, binding := range bindings {
		gv := binding.GVR.GroupVersion()
		byGroup[gv] = append(byGroup[gv], token)
	}
	result := make(map[string]nativeSchemaDocument, len(bindings))
	failures := make(map[string]error)
	for gv, tokens := range byGroup {
		if err := ctx.Err(); err != nil {
			for _, token := range tokens { failures[token] = err }
			continue
		}
		path := "/openapi/v3/apis/" + gv.Group + "/" + gv.Version
		if gv.Group == "" { path = "/openapi/v3/api/" + gv.Version }
		data, err := readNativeSchema(ctx, client, path)
		if err != nil {
			for _, token := range tokens { failures[token] = err }
			continue
		}
		if err := resourcev2.ValidateJSON(data); err != nil {
			for _, token := range tokens { failures[token] = err }
			continue
		}
		var document struct {
			Components struct {
				Schemas map[string]json.RawMessage `json:"schemas"`
			} `json:"components"`
		}
		if err := json.Unmarshal(data, &document); err != nil {
			for _, token := range tokens { failures[token] = fmt.Errorf("invalid native OpenAPI document: %w", err) }
			continue
		}
		digest := sha256.Sum256(data)
		revision := hex.EncodeToString(digest[:])
		roots := make(map[schema.GroupVersionKind]string)
		ambiguous := make(map[schema.GroupVersionKind]bool)
		for name, body := range document.Components.Schemas {
			var descriptor struct {
				Kinds []struct {
					Group string `json:"group"`
					Version string `json:"version"`
					Kind string `json:"kind"`
				} `json:"x-kubernetes-group-version-kind"`
			}
			if err := json.Unmarshal(body, &descriptor); err != nil { continue }
			root := "#/components/schemas/" + escapeJSONPointer(name)
			for _, kind := range descriptor.Kinds {
				key := schema.GroupVersionKind{Group: kind.Group, Version: kind.Version, Kind: kind.Kind}
				if prior, exists := roots[key]; exists && prior != root { ambiguous[key] = true }
				roots[key] = root
			}
		}
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
			result[token] = nativeSchemaDocument{Document: data, Root: root, Revision: revision}
		}
	}
	return result, failures
}

func readNativeSchema(ctx context.Context, client rest.Interface, path string) ([]byte, error) {
	stream, err := client.Get().AbsPath(path).Stream(ctx)
	if err != nil { return nil, err }
	defer stream.Close()
	data, err := io.ReadAll(io.LimitReader(stream, maxNativeSchemaBytes + 1))
	if err != nil { return nil, err }
	if len(data) > maxNativeSchemaBytes { return nil, fmt.Errorf("native OpenAPI document exceeds %d bytes", maxNativeSchemaBytes) }
	return data, ctx.Err()
}

func escapeJSONPointer(value string) string {
	return strings.ReplaceAll(strings.ReplaceAll(value, "~", "~0"), "/", "~1")
}
