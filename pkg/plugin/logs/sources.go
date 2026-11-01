package logs

import (
	"fmt"

	"github.com/omniview/kubernetes/pkg/utils"
	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/omniviewdev/plugin-sdk/pkg/v1/logs"

	corev1 "k8s.io/api/core/v1"
)

// podToSources extracts LogSources from a pod's containers.
func podToSources(pod corev1.Pod, target string) []logs.LogSource {
	var sources []logs.LogSource

	containers := allContainers(pod)
	for _, c := range containers {
		if target != "" && c.Name != target {
			continue
		}

		sources = append(sources, logs.LogSource{
			ID: fmt.Sprintf("%s/%s", pod.Name, c.Name),
			Labels: map[string]string{
				"pod":       pod.Name,
				"container": c.Name,
				"namespace": pod.Namespace,
				"node":      pod.Spec.NodeName,
			},
		})
	}

	return sources
}

// allContainers returns init, regular, and ephemeral containers.
func allContainers(pod corev1.Pod) []corev1.Container {
	containers := make([]corev1.Container, 0,
		len(pod.Spec.InitContainers)+len(pod.Spec.Containers)+len(pod.Spec.EphemeralContainers))

	containers = append(containers, pod.Spec.InitContainers...)
	containers = append(containers, pod.Spec.Containers...)

	for _, ec := range pod.Spec.EphemeralContainers {
		containers = append(containers, corev1.Container{
			Name:  ec.Name,
			Image: ec.Image,
		})
	}

	return containers
}

// PodSourceBuilder is a SourceBuilderFunc that extracts per-container sources
// from tagged pod resource data so the manager can fan
// out to one handler call per container. Without this, "all containers" mode
// sends a single request with an empty container name, which the K8s API
// rejects for multi-container pods.
func PodSourceBuilder(
	resourceID string,
	resourceData *resourcev2.Value,
	opts logs.LogSessionOptions,
) []logs.LogSource {
	// The builder has no selected client context. The stream handler validates
	// the route against that context before opening the native log stream.
	if opts.Reference != nil && opts.Route == nil {
		return nil
	}
	if opts.Route != nil && opts.Route.Connection == "" {
		return nil
	}
	name, namespace, err := utils.NativeResourceIdentity(resourceData, opts.Reference, "k8s:/pods", true)
	if err != nil {
		return nil
	}
	// A finite canonical read delegates optional container selection to the
	// native API. It needs no Pod Get or fabricated container observation.
	if opts.Reference != nil && !opts.Follow {
		return []logs.LogSource{{
			ID:     name + "/" + opts.Target,
			Labels: map[string]string{"pod": name, "namespace": namespace, "container": opts.Target},
		}}
	}

	// Gather container names from spec.containers, spec.initContainers,
	// and spec.ephemeralContainers in the raw resource data.
	spec, present := utils.TaggedField(resourceData, "spec")
	if !present || spec.Kind != "map" {
		return nil
	}

	type containerInfo struct {
		name string
	}
	var containers []containerInfo
	for _, key := range []string{"initContainers", "containers", "ephemeralContainers"} {
		arr := spec.Map[key]
		if arr.Kind != "list" {
			continue
		}
		for _, item := range arr.List {
			if item.Kind != "map" {
				continue
			}
			if cName := item.Map["name"]; cName.Kind == "string" && cName.String != "" {
				containers = append(containers, containerInfo{name: cName.String})
			}
		}
	}

	target := opts.Target
	node, _ := extractNodeName(resourceData)

	var sources []logs.LogSource
	for _, c := range containers {
		if target != "" && c.name != target {
			continue
		}
		sources = append(sources, logs.LogSource{
			ID: fmt.Sprintf("%s/%s", name, c.name),
			Labels: map[string]string{
				"pod":       name,
				"container": c.name,
				"namespace": namespace,
				"node":      node,
			},
		})
	}
	return sources
}

// extractNodeName reads spec.nodeName from raw resource data.
func extractNodeName(data *resourcev2.Value) (string, bool) {
	node, ok := utils.TaggedField(data, "spec", "nodeName")
	return node.String, ok && node.Kind == "string"
}

// extractNameAndNamespace extracts the name and namespace from resource data.
func extractNameAndNamespace(data *resourcev2.Value) (string, string) {
	name, _ := utils.TaggedField(data, "metadata", "name")
	namespace, _ := utils.TaggedField(data, "metadata", "namespace")
	var n, ns string
	if name.Kind == "string" {
		n = name.String
	}
	if namespace.Kind == "string" {
		ns = namespace.String
	}
	return n, ns
}
