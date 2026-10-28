package resource

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/omniview/kubernetes/pkg/plugin/helm"
	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	"github.com/omniview/kubernetes/pkg/utils/kubeauth"
	resourcev2 "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/omniviewdev/plugin-sdk/pkg/types"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestNativeSchemaAvailabilityDoesNotRequireHelmSecretPermission(t *testing.T) {
	t.Setenv("HELM_DRIVER", "secrets")
	var lists, secretGets atomic.Int32
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Header.Get("Authorization") != "Bearer native-schema-owned-token" {
			t.Error("metadata request lost existing authentication")
			http.Error(w, "authentication required", http.StatusUnauthorized)
			return
		}
		if r.Method == http.MethodGet && r.URL.Path == "/api/v1/secrets" {
			lists.Add(1)
			require.Equal(t, "256", r.URL.Query().Get("limit"))
			require.Equal(t, "owner=helm", r.URL.Query().Get("labelSelector"))
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(metav1.Status{Status: "Failure", Reason: metav1.StatusReasonForbidden, Code: http.StatusForbidden, Message: "private backend detail must not become a schema reason"})
			return
		}
		if strings.Contains(r.URL.Path, "/secrets/") {
			secretGets.Add(1)
		}
		t.Errorf("unexpected native schema request: %s %s", r.Method, r.URL.Path)
		http.NotFound(w, r)
	}))
	t.Cleanup(server.Close)
	route := resourcev2.AccessRoute{Connection: "native-schema-owned"}
	path := filepath.Join(t.TempDir(), "config")
	config := fmt.Sprintf("apiVersion: v1\nkind: Config\nclusters:\n- name: owned\n  cluster:\n    server: %s\n    insecure-skip-tls-verify: true\ncontexts:\n- name: native-schema-owned\n  context:\n    cluster: owned\n    user: owned\ncurrent-context: native-schema-owned\nusers:\n- name: owned\n  user:\n    token: native-schema-owned-token\n", server.URL)
	require.NoError(t, os.WriteFile(path, []byte(config), 0600))
	document := json.RawMessage(`{"openapi":"3.0.0","components":{"schemas":{"Pod":{"type":"object","properties":{"apiVersion":{"type":"string","enum":["v1"]},"kind":{"type":"string","enum":["Pod"]}}}}}}`)
	revision := "fixture-native-pod-schema"
	representation := boundaryRepresentation()
	representation.Schema = resourcev2.SchemaBinding{State: "available", Revision: &revision, Dialect: "openapi-3.0", Root: "#/components/schemas/Pod", Document: document, Validation: "none", Unvalidated: []string{}}
	descriptor := resourcev2.ResourceType{Type: "k8s:/pods", DefaultRepresentation: representation.ID, Representations: []resourcev2.Representation{representation}, IdentityDimensions: []resourcev2.Dimension{{Name: "namespace"}}, QueryDimensions: []resourcev2.Dimension{{Name: "namespace"}}}
	provider := &kubernetesProvider{catalogs: map[string]*nativeCatalogSnapshot{route.Connection: {catalog: resourcev2.Catalog{Provider: "kubernetes", Revision: "fixture-native-catalog", Types: []resourcev2.ResourceType{descriptor}, Coverage: resourcev2.Coverage{Kind: "complete"}}}}, helmAncillary: helm.NewHelmAncillary(zap.NewNop().Sugar())}
	controller, err := resourcev2.NewController(resourcev2.Config[clients.ClientSet]{Catalog: provider.catalog, Lifecycle: &resourcev2.Lifecycle[clients.ClientSet]{
		LoadConnections: func(context.Context) ([]types.Connection, error) {
			return []types.Connection{{ID: route.Connection, Name: "Owned native schema"}}, nil
		},
		CreateClient: func(ctx context.Context, _ types.Connection) (*clients.ClientSet, error) {
			bundle, err := kubeauth.LoadResourceKubeClients(ctx, path, route.Connection)
			if err != nil {
				return nil, err
			}
			// Authentication is deliberately available only through the already-created
			// transport, matching EKS's returned configuration without invoking AWS.
			bundle.RestConfig.BearerToken, bundle.RestConfig.BearerTokenFile = "", ""
			bundle.RestConfig.ExecProvider, bundle.RestConfig.AuthProvider = nil, nil
			return &clients.ClientSet{KubeClient: bundle.Clientset, RESTConfig: bundle.RestConfig, HTTPClient: bundle.HTTPClient}, nil
		},
		DestroyClient: (&kubeConnectionProvider{logger: zap.NewNop().Sugar()}).DestroyClient,
	}})
	require.NoError(t, err)
	provider.Controller = controller
	t.Cleanup(func() { require.NoError(t, controller.Close()) })
	_, err = controller.LoadConnections(context.Background())
	require.NoError(t, err)
	_, err = controller.StartConnection(context.Background(), route.Connection)
	require.NoError(t, err)
	schemas, err := provider.GetEditorSchemas(context.Background(), route)
	require.NoError(t, err, "unrelated Helm permission must not disable native Pod schema registration")
	require.Len(t, schemas, 2)
	native, unavailable := schemas[0], schemas[1]
	require.Equal(t, "k8s:/pods", native.Type)
	require.Equal(t, "available", native.Binding.State)
	require.JSONEq(t, string(document), string(native.Binding.Document))
	require.Nil(t, native.Binding.UnavailableReason)
	require.Equal(t, helm.ReleaseType, unavailable.Type)
	require.Equal(t, "**/helm:releases/*.yaml", unavailable.FileMatch)
	require.Equal(t, "helm://schemas/values/unavailable?connection=native-schema-owned", unavailable.URI)
	require.Equal(t, "unavailable", unavailable.Binding.State)
	require.NotNil(t, unavailable.Binding.UnavailableReason)
	require.Equal(t, "FORBIDDEN", *unavailable.Binding.UnavailableReason)
	require.Empty(t, unavailable.Binding.Document)
	require.Nil(t, unavailable.Binding.DocumentRef)
	require.Nil(t, unavailable.Binding.Revision)
	require.Equal(t, int32(1), lists.Load(), "permission failure must not retry metadata acquisition")
	require.Zero(t, secretGets.Load(), "metadata denial must not fall back to Secret GET")
	for _, schema := range schemas {
		_, err := resourcev2.ToProtoEditorSchema(schema)
		require.NoError(t, err)
	}
}
