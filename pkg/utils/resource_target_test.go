package utils

import (
	"testing"

	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/omniviewdev/plugin-sdk/pkg/types"
	"github.com/stretchr/testify/require"
)

func TestNativeResourceTargetCanonicalChecks(t *testing.T) {
	ctx := &types.PluginContext{Connection: &types.Connection{ID: "selected"}}
	uid := "uid"
	newReference := func() *resourcev2.ResourceReference {
		return &resourcev2.ResourceReference{Address: resourcev2.ResourceAddress{Provider: "kubernetes", Authority: "host-owned", Type: "k8s:/pods", Scope: []resourcev2.ScopeEntry{{Dimension: "namespace", Value: "ns"}}, ID: "pod"}, Incarnation: &uid}
	}
	newData := func() *resourcev2.Value {
		return &resourcev2.Value{Kind: "map", Map: map[string]resourcev2.Value{
			"metadata": {Kind: "map", Map: map[string]resourcev2.Value{"name": {Kind: "string", String: "pod"}, "namespace": {Kind: "string", String: "ns"}, "uid": {Kind: "string", String: "uid"}}},
			"wide":     {Kind: "uint64", Uint: "18446744073709551615"},
			"signed":   {Kind: "int64", Int: "-9223372036854775808"},
		}}
	}
	for _, tc := range []struct {
		name  string
		alter func(*resourcev2.ResourceReference, *resourcev2.Value, *resourcev2.AccessRoute)
	}{
		{"provider", func(ref *resourcev2.ResourceReference, _ *resourcev2.Value, _ *resourcev2.AccessRoute) {
			ref.Address.Provider = "other"
		}},
		{"type", func(ref *resourcev2.ResourceReference, _ *resourcev2.Value, _ *resourcev2.AccessRoute) {
			ref.Address.Type = "k8s:/nodes"
		}},
		{"scope", func(ref *resourcev2.ResourceReference, _ *resourcev2.Value, _ *resourcev2.AccessRoute) {
			ref.Address.Scope[0].Value = "other"
		}},
		{"body kind", func(_ *resourcev2.ResourceReference, data *resourcev2.Value, _ *resourcev2.AccessRoute) {
			data.Map["kind"] = resourcev2.Value{Kind: "string", String: "Node"}
		}},
		{"body group", func(_ *resourcev2.ResourceReference, data *resourcev2.Value, _ *resourcev2.AccessRoute) {
			data.Map["apiVersion"] = resourcev2.Value{Kind: "string", String: "apps/v1"}
		}},
		{"name", func(ref *resourcev2.ResourceReference, _ *resourcev2.Value, _ *resourcev2.AccessRoute) {
			ref.Address.ID = "other"
		}},
		{"uid", func(_ *resourcev2.ResourceReference, data *resourcev2.Value, _ *resourcev2.AccessRoute) {
			data.Map["metadata"].Map["uid"] = resourcev2.Value{Kind: "string", String: "other"}
		}},
		{"route", func(_ *resourcev2.ResourceReference, _ *resourcev2.Value, route *resourcev2.AccessRoute) {
			route.Connection = "other"
		}},
		{"tag", func(_ *resourcev2.ResourceReference, data *resourcev2.Value, _ *resourcev2.AccessRoute) {
			data.Map["metadata"].Map["name"] = resourcev2.Value{Kind: "int64", Int: "123"}
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ref, data, route := newReference(), newData(), &resourcev2.AccessRoute{Connection: "selected"}
			tc.alter(ref, data, route)
			_, _, err := NativeResourceTarget(ctx, data, ref, route, "k8s:/pods", true)
			require.Error(t, err)
			require.Equal(t, "18446744073709551615", data.Map["wide"].Uint)
			require.Equal(t, "-9223372036854775808", data.Map["signed"].Int)
		})
	}
	ref, data, route := newReference(), newData(), &resourcev2.AccessRoute{Connection: "selected"}
	name, namespace, err := NativeResourceTarget(ctx, data, ref, route, "k8s:/pods", true)
	require.NoError(t, err)
	require.Equal(t, "pod", name)
	require.Equal(t, "ns", namespace)
	// Reference-only native access needs no body GET or fresh client permission.
	_, _, err = NativeResourceTarget(ctx, nil, ref, route, "k8s:/pods", true)
	require.NoError(t, err)
	_, _, err = NativeResourceTarget(ctx, data, ref, nil, "k8s:/pods", true)
	require.ErrorContains(t, err, "explicit route")
}

func TestNativeResourceTargetClusterScopeAndAbsentIntent(t *testing.T) {
	ctx := &types.PluginContext{Connection: &types.Connection{ID: "selected"}}
	ref := &resourcev2.ResourceReference{Address: resourcev2.ResourceAddress{Provider: "kubernetes", Authority: "host-owned", Type: "k8s:/nodes", ID: "node"}}
	name, namespace, err := NativeResourceTarget(ctx, nil, ref, &resourcev2.AccessRoute{Connection: "selected"}, "k8s:/nodes", false)
	require.NoError(t, err)
	require.Equal(t, "node", name)
	require.Empty(t, namespace)
	ref.Address.Scope = []resourcev2.ScopeEntry{{Dimension: "namespace", Value: "ns"}}
	_, _, err = NativeResourceTarget(ctx, nil, ref, &resourcev2.AccessRoute{Connection: "selected"}, "k8s:/nodes", false)
	require.Error(t, err)
	_, _, err = NativeResourceTarget(ctx, nil, nil, nil, "k8s:/nodes", false)
	require.Error(t, err)
}
