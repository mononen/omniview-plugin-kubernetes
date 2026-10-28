package resource

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

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
		Host:          server.URL,
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
		"core::v1::Pod":  {GVR: schema.GroupVersionResource{Version: "v1", Resource: "pods"}, API: metav1.APIResource{Kind: "Pod"}},
		"core::v1::Node": {GVR: schema.GroupVersionResource{Version: "v1", Resource: "nodes"}, API: metav1.APIResource{Kind: "Node"}},
	}
	budget := &nativeSchemaBudget{}
	result, failures, lease := fetchNativeSchemas(context.Background(), client, bindings, budget)
	defer lease.Release()
	require.Empty(t, failures)
	require.Equal(t, int32(1), calls.Load(), "fetch each group/version only once")
	require.Equal(t, document, string(result["core::v1::Pod"].Document))
	require.Equal(t, "#/components/schemas/native.Pod", result["core::v1::Pod"].Root)
	require.Equal(t, "#/components/schemas/native.Node", result["core::v1::Node"].Root)
	require.Equal(t, result["core::v1::Pod"].Revision, result["core::v1::Node"].Revision)
	require.NotEmpty(t, result["core::v1::Pod"].Revision)
	require.Equal(t, len(document), budget.used, "shared document is charged only once")
	require.True(t, &result["core::v1::Pod"].Document[0] == &result["core::v1::Node"].Document[0], "type entries share one allocation")
	require.Equal(t, len(document), cap(result["core::v1::Pod"].Document))
}

func TestNativeSchemaFailureIsNotAbsence(t *testing.T) {
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	bindings := map[string]nativeType{"pod": {GVR: schema.GroupVersionResource{Version: "v1", Resource: "pods"}, API: metav1.APIResource{Kind: "Pod"}}}
	result, failures, lease := fetchNativeSchemas(context.Background(), client, bindings, &nativeSchemaBudget{})
	defer lease.Release()
	require.Empty(t, result)
	require.Error(t, failures["pod"])
}

func TestNativeSchemaCancellation(t *testing.T) {
	var calls atomic.Int32
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { calls.Add(1) }))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	bindings := map[string]nativeType{"pod": {GVR: schema.GroupVersionResource{Version: "v1", Resource: "pods"}, API: metav1.APIResource{Kind: "Pod"}}}
	result, failures, lease := fetchNativeSchemas(ctx, client, bindings, &nativeSchemaBudget{})
	defer lease.Release()
	require.Empty(t, result)
	require.ErrorIs(t, failures["pod"], context.Canceled)
	require.Zero(t, calls.Load())
}

func schemaBudgetFixture(group string) string {
	return fmt.Sprintf(`{"openapi":"3.0.0","components":{"schemas":{"native.Pod":{"x-kubernetes-group-version-kind":[{"group":%q,"version":"v1","kind":"Pod"}],"properties":{"spec":{"$ref":"#/components/schemas/native.Spec"}}},"native.Spec":{"type":"object"}}}}`, group)
}

func schemaBudgetBinding(group string) nativeType {
	return nativeType{GVR: schema.GroupVersionResource{Group: group, Version: "v1", Resource: "pods"}, API: metav1.APIResource{Kind: "Pod"}}
}

func TestNativeSchemaBudgetAcrossGroupsAndConnections(t *testing.T) {
	first, second := schemaBudgetFixture("a"), schemaBudgetFixture("b")
	var calls atomic.Int32
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		switch r.URL.Path {
		case "/openapi/v3/apis/a/v1":
			_, _ = w.Write([]byte(first))
		case "/openapi/v3/apis/b/v1":
			_, _ = w.Write([]byte(second))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	budget := &nativeSchemaBudget{limit: len(first) + len(second) - 1}
	result, failures, lease := fetchNativeSchemas(context.Background(), client, map[string]nativeType{
		"a": schemaBudgetBinding("a"), "b": schemaBudgetBinding("b"),
	}, budget)
	require.Equal(t, first, string(result["a"].Document))
	require.NotContains(t, result, "b", "unavailable schemas must not inherit another group's document")
	require.ErrorContains(t, failures["b"], "budget exhausted")
	require.Equal(t, len(first), budget.used)
	require.Equal(t, int32(2), calls.Load())

	other, otherFailures, otherLease := fetchNativeSchemas(context.Background(), client, map[string]nativeType{"b": schemaBudgetBinding("b")}, budget)
	require.Empty(t, other, "another connection shares the provider budget")
	require.ErrorContains(t, otherFailures["b"], "budget exhausted")
	require.Equal(t, len(first), budget.used)
	otherLease.Release()
	require.Equal(t, len(first), budget.used)

	// Drop the first snapshot before releasing its accounting, as teardown and
	// replacement do in the provider.
	result = nil
	lease.Release()
	lease.Release()
	require.Zero(t, budget.used, "release is idempotent")
	replacement, replacementFailures, replacementLease := fetchNativeSchemas(context.Background(), client, map[string]nativeType{"b": schemaBudgetBinding("b")}, budget)
	require.Empty(t, replacementFailures)
	require.Equal(t, second, string(replacement["b"].Document))
	require.Equal(t, len(second), budget.used)
	replacement = nil
	replacementLease.Release()
	require.Zero(t, budget.used)
}

func TestNativeSchemaBudgetExactBoundaryAndFailedReplacement(t *testing.T) {
	document := schemaBudgetFixture("a")
	var invalid atomic.Bool
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if invalid.Load() {
			_, _ = w.Write([]byte(`{"components":{},"components":{}}`))
			return
		}
		_, _ = w.Write([]byte(document))
	}))
	budget := &nativeSchemaBudget{limit: len(document)}
	bindings := map[string]nativeType{"a": schemaBudgetBinding("a")}
	result, failures, lease := fetchNativeSchemas(context.Background(), client, bindings, budget)
	require.Empty(t, failures)
	require.Len(t, result, 1)
	require.Equal(t, budget.limit, budget.used)
	blocked, blockedFailures, blockedLease := fetchNativeSchemas(context.Background(), client, bindings, budget)
	require.Empty(t, blocked)
	require.ErrorContains(t, blockedFailures["a"], "budget exhausted")
	blockedLease.Release()
	result = nil
	lease.Release()
	invalid.Store(true)
	failed, failedErrors, failedLease := fetchNativeSchemas(context.Background(), client, bindings, budget)
	require.Empty(t, failed)
	require.Error(t, failedErrors["a"], "duplicate JSON keys stay invalid")
	failedLease.Release()
	require.Zero(t, budget.used, "failed replacement must not retain bytes")
	invalid.Store(false)
	recovered, recoveredErrors, recoveredLease := fetchNativeSchemas(context.Background(), client, bindings, budget)
	require.Len(t, recovered, 1)
	require.Empty(t, recoveredErrors)
	recoveredLease.Release()
}

func TestNativeSchemaUnmappedDocumentDoesNotConsumeBudget(t *testing.T) {
	document := schemaBudgetFixture("different")
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(document))
	}))
	budget := &nativeSchemaBudget{limit: len(document)}
	result, failures, lease := fetchNativeSchemas(context.Background(), client, map[string]nativeType{"a": schemaBudgetBinding("a")}, budget)
	defer lease.Release()
	require.Empty(t, result)
	require.ErrorContains(t, failures["a"], "root unavailable")
	require.Zero(t, budget.used)
}

func TestNativeSchemaDocumentLimitSurvivesAggregateBudget(t *testing.T) {
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(strings.Repeat(" ", maxNativeSchemaBytes+1)))
	}))
	budget := &nativeSchemaBudget{}
	result, failures, lease := fetchNativeSchemas(context.Background(), client, map[string]nativeType{"a": schemaBudgetBinding("a")}, budget)
	defer lease.Release()
	require.Empty(t, result)
	require.ErrorContains(t, failures["a"], "document exceeds")
	require.Zero(t, budget.used)
	require.Equal(t, 32<<20, maxNativeRetainedSchemaBytes)
}

func TestNativeSchemaReleaseAndQueuedCancellationDuringFetch(t *testing.T) {
	document := schemaBudgetFixture("a")
	held := make(chan struct{})
	unblock := make(chan struct{})
	var calls atomic.Int32
	client := nativeSchemaRESTClient(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.URL.Path == "/openapi/v3/apis/b/v1" {
			close(held)
			select {
			case <-unblock:
			case <-r.Context().Done():
				return
			}
			_, _ = w.Write([]byte(schemaBudgetFixture("b")))
			return
		}
		_, _ = w.Write([]byte(document))
	}))
	budget := &nativeSchemaBudget{limit: 2 * len(document)}
	result, failures, firstLease := fetchNativeSchemas(context.Background(), client, map[string]nativeType{"a": schemaBudgetBinding("a")}, budget)
	require.Empty(t, failures)
	require.Len(t, result, 1)
	defer firstLease.Release()
	result = nil

	fetchDone := make(chan struct{})
	heldCtx, cancelHeld := context.WithCancel(context.Background())
	go func() {
		defer close(fetchDone)
		_, _, lease := fetchNativeSchemas(heldCtx, client, map[string]nativeType{"b": schemaBudgetBinding("b")}, budget)
		lease.Release()
	}()
	defer func() {
		cancelHeld()
		close(unblock)
		<-fetchDone
	}()
	select {
	case <-held:
	case <-time.After(5 * time.Second):
		t.Fatal("second connection did not start its HTTP request")
	}

	released := make(chan struct{})
	go func() {
		firstLease.Release()
		close(released)
	}()
	select {
	case <-released:
	case <-time.After(5 * time.Second):
		t.Fatal("snapshot release blocked behind another connection's HTTP request")
	}
	budget.mu.Lock()
	used := budget.used
	budget.mu.Unlock()
	require.Zero(t, used)

	queuedCtx, cancelQueued := context.WithCancel(context.Background())
	defer cancelQueued()
	queued := make(chan struct{})
	cancelResult := make(chan error, 1)
	go func() {
		close(queued)
		_, failures, lease := fetchNativeSchemas(queuedCtx, client, map[string]nativeType{"c": schemaBudgetBinding("c")}, budget)
		lease.Release()
		cancelResult <- failures["c"]
	}()
	<-queued
	cancelQueued()
	select {
	case err := <-cancelResult:
		require.ErrorIs(t, err, context.Canceled)
	case <-time.After(5 * time.Second):
		t.Fatal("queued schema fetch ignored cancellation")
	}
	require.Equal(t, int32(2), calls.Load(), "queued canceled connection must not issue HTTP")
}
