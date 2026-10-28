package resource

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer"
	"k8s.io/client-go/rest"
)

func nativeSchemaRESTClient(t *testing.T, handler http.Handler) rest.Interface {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	client, err := rest.UnversionedRESTClientFor(&rest.Config{
		Host: server.URL,
		ContentConfig: rest.ContentConfig{NegotiatedSerializer: serializer.NewCodecFactory(runtime.NewScheme()).WithoutConversion()},
	})
	require.NoError(t, err)
	return client
}

func TestNativeSchemaKeepsExactDocumentAndRoot(t *testing.T) {
	const document = `{"openapi":"3.0.0","components":{"schemas":{"native.Pod":{"x-kubernetes-group-version-kind":[{"group":"","version":"v1","kind":"Pod"}],"properties":{"spec":{"$ref":"#/components/schemas/native.Spec"}}},"native.Spec":{"type":"object"},"native.Node":{"x-kubernetes-group-version-kind":[{"group":"","version":"v1","kind":"Node"}],"type":"object"}}}}`
	var calls atomic.Int32
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		require.Equal(t, "/openapi/v3/api/v1", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(document))
	}))
	bindings := map[string]nativeType{
		"core::v1::Pod": {GVR: schema.GroupVersionResource{Version: "v1", Resource: "pods"}, API: metav1.APIResource{Kind: "Pod"}},
		"core::v1::Node": {GVR: schema.GroupVersionResource{Version: "v1", Resource: "nodes"}, API: metav1.APIResource{Kind: "Node"}},
	}
	result, failures := fetchNativeSchemas(context.Background(), client, bindings)
	require.Empty(t, failures)
	require.Equal(t, int32(1), calls.Load(), "fetch each group/version only once")
	require.Equal(t, document, string(result["core::v1::Pod"].Document))
	require.Equal(t, "#/components/schemas/native.Pod", result["core::v1::Pod"].Root)
	require.Equal(t, "#/components/schemas/native.Node", result["core::v1::Node"].Root)
	require.Equal(t, result["core::v1::Pod"].Revision, result["core::v1::Node"].Revision)
	require.NotEmpty(t, result["core::v1::Pod"].Revision)
}

func TestNativeSchemaFailureIsNotAbsence(t *testing.T) {
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	bindings := map[string]nativeType{"pod": {GVR: schema.GroupVersionResource{Version: "v1", Resource: "pods"}, API: metav1.APIResource{Kind: "Pod"}}}
	result, failures := fetchNativeSchemas(context.Background(), client, bindings)
	require.Empty(t, result)
	require.Error(t, failures["pod"])
}

func TestNativeSchemaCancellation(t *testing.T) {
	var calls atomic.Int32
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { calls.Add(1) }))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	bindings := map[string]nativeType{"pod": {GVR: schema.GroupVersionResource{Version: "v1", Resource: "pods"}, API: metav1.APIResource{Kind: "Pod"}}}
	result, failures := fetchNativeSchemas(ctx, client, bindings)
	require.Empty(t, result)
	require.ErrorIs(t, failures["pod"], context.Canceled)
	require.Zero(t, calls.Load())
}
