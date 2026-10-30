package resource

import (
	"context"
	"encoding/json"
	"fmt"
	"io"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/rest"
)

const (
	maxNativeDiscoveryVersions = 256
	maxNativeDiscoveryBytes = 16 << 20
	maxNativeDiscoveryDocumentBytes = 4 << 20
)

// Native discovery uses the existing client's transport with the acquisition
// context. client-go's ServerGroupsAndResources has no context parameter.
func discoverNativeResources(ctx context.Context, client discovery.DiscoveryInterface) ([]*metav1.APIGroup, []*metav1.APIResourceList, error) {
	restClient := client.RESTClient()
	if _, native := client.(*discovery.DiscoveryClient); !native || restClient == nil {
		// Injected discovery implementations supply their own response.
		return client.ServerGroupsAndResources()
	}
	remaining := maxNativeDiscoveryBytes
	var core metav1.APIVersions
	if err := readNativeDiscovery(ctx, restClient, "/api", &core, &remaining); err != nil {
		return nil, nil, err
	}
	var advertised metav1.APIGroupList
	if err := readNativeDiscovery(ctx, restClient, "/apis", &advertised, &remaining); err != nil {
		return nil, nil, err
	}
	groups := make([]*metav1.APIGroup, 0, len(advertised.Groups))
	versions := make([]schema.GroupVersion, 0, len(core.Versions))
	for _, version := range core.Versions {
		versions = append(versions, schema.GroupVersion{Version: version})
	}
	for index := range advertised.Groups {
		group := &advertised.Groups[index]
		groups = append(groups, group)
		for _, version := range group.Versions {
			gv, err := schema.ParseGroupVersion(version.GroupVersion)
			if err != nil || gv.Group != group.Name || gv.Version != version.Version {
				return nil, nil, fmt.Errorf("invalid Kubernetes discovery group version")
			}
			versions = append(versions, gv)
		}
	}
	if len(versions) > maxNativeDiscoveryVersions {
		return nil, nil, fmt.Errorf("Kubernetes discovery exceeds the served-version budget")
	}
	lists := make([]*metav1.APIResourceList, 0, len(versions))
	failed := make(map[schema.GroupVersion]error)
	seen := make(map[schema.GroupVersion]bool, len(versions))
	for _, gv := range versions {
		if seen[gv] || gv.Version == "" {
			return nil, nil, fmt.Errorf("invalid or duplicate Kubernetes discovery group version")
		}
		seen[gv] = true
		path := "/apis/" + gv.String()
		if gv.Group == "" {
			path = "/api/" + gv.Version
		}
		var list metav1.APIResourceList
		if err := readNativeDiscovery(ctx, restClient, path, &list, &remaining); err != nil {
			if ctx.Err() != nil {
				return nil, nil, ctx.Err()
			}
			failed[gv] = err
			continue
		}
		if list.GroupVersion != gv.String() {
			return nil, nil, fmt.Errorf("Kubernetes discovery returned a different group version")
		}
		lists = append(lists, &list)
	}
	if len(failed) != 0 {
		return groups, lists, &discovery.ErrGroupDiscoveryFailed{Groups: failed}
	}
	return groups, lists, nil
}

func readNativeDiscovery(ctx context.Context, client rest.Interface, path string, into any, remaining *int) error {
	if *remaining <= 0 {
		return fmt.Errorf("Kubernetes discovery exceeds the byte budget")
	}
	stream, err := client.Get().AbsPath(path).Stream(ctx)
	if err != nil {
		return err
	}
	defer stream.Close()
	limit := min(*remaining, maxNativeDiscoveryDocumentBytes)
	data, err := io.ReadAll(io.LimitReader(stream, int64(limit)+1))
	if err != nil {
		return err
	}
	*remaining -= len(data)
	if len(data) > limit {
		return fmt.Errorf("Kubernetes discovery exceeds the byte budget")
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	return json.Unmarshal(data, into)
}
