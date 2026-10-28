package networker

import (
	"testing"

	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/omniviewdev/plugin-sdk/pkg/types"
	sdknetworker "github.com/omniviewdev/plugin-sdk/pkg/v1/networker"
	"github.com/stretchr/testify/require"
)

// These fixture adapters are test-only. Native handlers consume Value directly.
func taggedFixture(raw any) *resourcev2.Value {
	if raw == nil {
		return nil
	}
	value := fixtureValue(raw)
	return &value
}

func fixtureValue(raw any) resourcev2.Value {
	value, err := resourcev2.ValueFromNative(raw)
	if err != nil {
		panic(err)
	}
	return value
}

func TestNativeForwardTargetConsumesCanonicalIdentityWithoutGet(t *testing.T) {
	ctx := &types.PluginContext{Connection: &types.Connection{ID: "selected"}}
	uid := "uid"
	ref := &resourcev2.ResourceReference{Address: resourcev2.ResourceAddress{Provider: "kubernetes", Authority: "host-owned", Type: "k8s:/pods", Scope: []resourcev2.ScopeEntry{{Dimension: "namespace", Value: "ns"}}, ID: "pod"}, Incarnation: &uid}
	target := sdknetworker.PortForwardResourceConnection{Reference: ref, Route: &resourcev2.AccessRoute{Connection: "selected"}, ResourceKey: "k8s:/pods"}
	name, namespace, err := nativeForwardTarget(ctx, target, "k8s:/pods")
	require.NoError(t, err)
	require.Equal(t, "pod", name)
	require.Equal(t, "ns", namespace)
	// No kubeconfig/client exists: successful identity extraction cannot GET.
	target.ResourceData = taggedFixture(map[string]any{"metadata": map[string]any{"name": "pod", "namespace": "ns", "uid": "other"}})
	_, _, err = nativeForwardTarget(ctx, target, "k8s:/pods")
	require.ErrorContains(t, err, "incarnation")
	target.ResourceData = nil
	target.Route = &resourcev2.AccessRoute{Connection: "other"}
	_, _, err = nativeForwardTarget(ctx, target, "k8s:/pods")
	require.ErrorContains(t, err, "route")
}

func TestTaggedSelectorAndPortsKeepExactWideFields(t *testing.T) {
	data := taggedFixture(map[string]any{"spec": map[string]any{"selector": map[string]any{"app": "web"}}})
	data.Map["wide"] = resourcev2.Value{Kind: "uint64", Uint: "18446744073709551615"}
	selector, err := extractPodSelector("k8s:/services", data)
	require.NoError(t, err)
	require.Equal(t, map[string]string{"app": "web"}, selector)
	require.Equal(t, "18446744073709551615", data.Map["wide"].Uint)
	for _, malformed := range []resourcev2.Value{
		{Kind: "uint64", Uint: "18446744073709551615"},
		{Kind: "int64", Int: "-9223372036854775808"},
		{Kind: "double", Double: 8080},
		{Kind: "string", String: "8080"},
	} {
		ports := []resourcev2.Value{{Kind: "map", Map: map[string]resourcev2.Value{"port": {Kind: "int64", Int: "80"}, "targetPort": malformed}}}
		require.Equal(t, int32(80), resolveServiceTargetPort(ports, 80))
	}
}
