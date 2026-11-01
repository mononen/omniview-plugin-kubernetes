package helm

import (
	"context"
	"testing"

	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"helm.sh/helm/v3/pkg/action"
)

func TestHelmRegisteredActionsMatchCatalog(t *testing.T) {
	h := NewHelmAncillary(zap.NewNop().Sugar())
	for _, registration := range h.Registrations() {
		descriptors, err := h.GetActions(context.Background(), nil, registration.Type)
		require.NoError(t, err)
		require.NotEmpty(t, registration.Actions)
		require.Equal(t, descriptors, registration.Actions)
		require.NoError(t, resource.ValidateActionDescriptors(registration.Actions))
	}
}

func TestHelmTypeActionScopeAndInputAdmission(t *testing.T) {
	h := NewHelmAncillary(zap.NewNop().Sugar())
	for _, typ := range []string{ReleaseType, RepositoryType} {
		dimension, value, id := "namespace", "team", "install"
		if typ == RepositoryType {
			dimension, value, id = "domain", helmLocalDomain, "add"
		}
		values := []string{value}
		target := &resource.TypeActionTarget{Type: typ, Scope: resource.QueryScope{{Dimension: dimension, Match: resource.ScopeOneOf, Values: &values}}}
		request := resource.ActionRequest{TypeTarget: target, Action: id, Input: resource.Value{Kind: "map"}}
		_, err := actionNamespace(request)
		require.NoError(t, err)
		_, err = h.Action(context.Background(), nil, request)
		require.Equal(t, "INVALID_REQUEST", resource.ErrorCode(err), "missing explicit name must fail before native work")
		request.Reference.Address = resource.ResourceAddress{Type: typ, ID: "fabricated", Scope: []resource.ScopeEntry{{Dimension: dimension, Value: value}}}
		_, err = h.Action(context.Background(), nil, request)
		require.Equal(t, "INVALID_REQUEST", resource.ErrorCode(err))
		request.TypeTarget = nil
		_, err = h.Action(context.Background(), nil, request)
		require.Equal(t, "INVALID_REQUEST", resource.ErrorCode(err), "type action cannot use instance reference")
		request.Reference = resource.ResourceReference{}
		request.TypeTarget = target
		values = append(values, "other")
		_, err = actionNamespace(request)
		require.Equal(t, "INVALID_REQUEST", resource.ErrorCode(err))
		target.Scope[0] = resource.ScopeConstraint{Dimension: dimension, Match: resource.ScopeAny}
		_, err = actionNamespace(request)
		require.Equal(t, "INVALID_REQUEST", resource.ErrorCode(err))
	}
}

func TestHelmInstallHandlersRequireExplicitName(t *testing.T) {
	r := NewHelmAncillary(zap.NewNop().Sugar()).release
	values := []string{"team"}
	request := resource.ActionRequest{
		TypeTarget: &resource.TypeActionTarget{Type: ReleaseType, Scope: resource.QueryScope{{Dimension: "namespace", Match: resource.ScopeOneOf, Values: &values}}},
		Input:      resource.Value{Kind: "map", Map: map[string]resource.Value{"chart": {Kind: "string", String: "unused"}}},
	}
	_, err := r.executeInstall(&action.Configuration{}, request)
	require.EqualError(t, err, "release name is required")
	_, err = r.executeDryRunInstall(&action.Configuration{}, request)
	require.EqualError(t, err, "release name is required")
}

func TestHelmTypeActionInputCannotWidenNativeScope(t *testing.T) {
	h := NewHelmAncillary(zap.NewNop().Sugar())
	for _, typ := range []string{ReleaseType, RepositoryType} {
		dimension, selected, action := "namespace", "team", "install"
		if typ == RepositoryType {
			dimension, selected, action = "domain", helmLocalDomain, "add"
		}
		values := []string{selected}
		request := resource.ActionRequest{
			TypeTarget: &resource.TypeActionTarget{Type: typ, Scope: resource.QueryScope{{Dimension: dimension, Match: resource.ScopeOneOf, Values: &values}}},
			Action:     action,
			Input: resource.Value{Kind: "map", Map: map[string]resource.Value{
				"name":    {Kind: "string", String: "native-name"},
				"chart":   {Kind: "string", String: "unused"},
				"url":     {Kind: "string", String: "https://unused.example"},
				dimension: {Kind: "string", String: "other"},
			}},
		}
		_, err := h.Action(context.Background(), nil, request)
		require.Equal(t, "INVALID_REQUEST", resource.ErrorCode(err), "scope mismatch must fail before native client access")
		request.Input.Map[dimension] = resource.Value{Kind: "string", String: selected}
		actualNamespace, err := actionNamespace(request)
		require.NoError(t, err)
		if typ == ReleaseType {
			require.Equal(t, selected, actualNamespace)
		} else {
			require.Empty(t, actualNamespace)
		}
	}
}
