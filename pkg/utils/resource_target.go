package utils

import (
	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/omniviewdev/plugin-sdk/pkg/types"
	"strings"
)

// TaggedField reads only map fields. It never decodes or rewrites unrelated values.
func TaggedField(data *resourcev2.Value, path ...string) (resourcev2.Value, bool) {
	if data == nil {
		return resourcev2.Value{}, false
	}
	value := *data
	for _, key := range path {
		if value.Kind != "map" {
			return resourcev2.Value{}, false
		}
		var present bool
		value, present = value.Map[key]
		if !present {
			return resourcev2.Value{}, false
		}
	}
	return value, true
}

// NativeResourceTarget checks observations against a canonical target without
// minting identity or adding a Kubernetes GET permission requirement.
func NativeResourceTarget(ctx *types.PluginContext, data *resourcev2.Value, reference *resourcev2.ResourceReference, route *resourcev2.AccessRoute, resourceType string, namespaced bool) (name, namespace string, err error) {
	invalid := func(message string) (string, string, error) {
		return "", "", resourcev2.NewError("INVALID_REQUEST", message)
	}
	if route != nil && (route.Connection == "" || ctx == nil || ctx.Connection == nil || route.Connection != ctx.Connection.ID) {
		return invalid("resource route does not match the selected connection")
	}
	if reference != nil && route == nil {
		return invalid("a canonical resource reference requires an explicit route")
	}
	return NativeResourceIdentity(data, reference, resourceType, namespaced)
}

// NativeResourceIdentity checks the tagged observation and optional reference.
// Callers with a client context must also validate the selected access route.
func NativeResourceIdentity(data *resourcev2.Value, reference *resourcev2.ResourceReference, resourceType string, namespaced bool) (name, namespace string, err error) {
	invalid := func(message string) (string, string, error) {
		return "", "", resourcev2.NewError("INVALID_REQUEST", message)
	}
	if data != nil && data.Kind != "map" {
		return invalid("resource data must be a document")
	}
	if observed, present := TaggedField(data, "apiVersion"); present {
		if observed.Kind != "string" {
			return invalid("apiVersion must be a string")
		}
		group := ""
		if nativeGroup, _, grouped := strings.Cut(observed.String, "/"); grouped {
			group = nativeGroup
		}
		expectedGroup, _, native := strings.Cut(strings.TrimPrefix(resourceType, "k8s:"), "/")
		if !native || group != expectedGroup {
			return invalid("resource apiVersion does not match its native handler")
		}
	}
	if observed, present := TaggedField(data, "kind"); present {
		if observed.Kind != "string" || observed.String != nativeUtilityKind(resourceType) {
			return invalid("resource kind does not match its native handler")
		}
	}
	metadata, hasMetadata := TaggedField(data, "metadata")
	if hasMetadata && metadata.Kind != "map" {
		return invalid("metadata must be a map")
	}
	if reference != nil {
		if err := resourcev2.ValidateAddress(reference.Address); err != nil {
			return "", "", err
		}
		if reference.Address.Provider != "kubernetes" || reference.Address.Type != resourceType {
			return invalid("resource reference does not match its native handler")
		}
		name = reference.Address.ID
		if namespaced {
			if len(reference.Address.Scope) != 1 || reference.Address.Scope[0].Dimension != "namespace" || reference.Address.Scope[0].Value == "" {
				return invalid("namespace is required")
			}
			namespace = reference.Address.Scope[0].Value
		} else if len(reference.Address.Scope) != 0 {
			return invalid("resource requires cluster scope")
		}
		if observed, present := metadata.Map["name"]; present && (observed.Kind != "string" || observed.String != name) {
			return invalid("resource metadata name does not match the reference")
		}
		if observed, present := metadata.Map["namespace"]; present && (observed.Kind != "string" || observed.String != namespace) {
			return invalid("resource metadata namespace does not match the reference")
		}
		if reference.Incarnation != nil {
			if *reference.Incarnation == "" {
				return invalid("resource incarnation must be absent or nonempty")
			}
			if observed, present := metadata.Map["uid"]; present && (observed.Kind != "string" || observed.String != *reference.Incarnation) {
				return "", "", resourcev2.NewError("RESET_REQUIRED", "resource metadata incarnation does not match the reference")
			}
		}
		return name, namespace, nil
	}
	observed, present := metadata.Map["name"]
	if !present || observed.Kind != "string" || observed.String == "" {
		return invalid("resource name is required")
	}
	name = observed.String
	if observed, present = metadata.Map["namespace"]; present {
		if observed.Kind != "string" {
			return invalid("namespace must be a string")
		}
		namespace = observed.String
	}
	if namespaced && namespace == "" {
		return invalid("namespace is required")
	}
	if !namespaced && namespace != "" {
		return invalid("resource requires cluster scope")
	}
	return name, namespace, nil
}

func nativeUtilityKind(resourceType string) string {
	switch resourceType {
	case "k8s:/pods":
		return "Pod"
	case "k8s:/nodes":
		return "Node"
	case "k8s:/services":
		return "Service"
	case "k8s:/replicationcontrollers":
		return "ReplicationController"
	case "k8s:apps/deployments":
		return "Deployment"
	case "k8s:apps/statefulsets":
		return "StatefulSet"
	case "k8s:apps/daemonsets":
		return "DaemonSet"
	case "k8s:apps/replicasets":
		return "ReplicaSet"
	case "k8s:batch/jobs":
		return "Job"
	case "k8s:batch/cronjobs":
		return "CronJob"
	default:
		return ""
	}
}
