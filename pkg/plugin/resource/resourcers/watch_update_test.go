package resourcers

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
)

func TestMakeEventHandler_Update(t *testing.T) {
	tests := []struct {
		name    string
		prepare func(old, next *unstructured.Unstructured) (interface{}, interface{})
		forward bool
	}{
		{name: "unchanged replay"},
		{
			name: "same pointer replay",
			prepare: func(old, _ *unstructured.Unstructured) (interface{}, interface{}) {
				return old, old
			},
		},
		{
			name: "changed version",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				next.SetResourceVersion("43")
				return old, next
			},
			forward: true,
		},
		{
			name: "both versions empty",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				old.SetResourceVersion("")
				next.SetResourceVersion("")
				return old, next
			},
			forward: true,
		},
		{
			name: "old version empty",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				old.SetResourceVersion("")
				return old, next
			},
			forward: true,
		},
		{
			name: "new version empty",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				next.SetResourceVersion("")
				return old, next
			},
			forward: true,
		},
		{
			name: "replacement UID",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				next.SetUID("replacement-uid")
				return old, next
			},
			forward: true,
		},
		{
			name: "removed UID",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				next.SetUID("")
				return old, next
			},
			forward: true,
		},
		{
			name: "different name",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				next.SetName("replacement-name")
				return old, next
			},
			forward: true,
		},
		{
			name: "different namespace",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				next.SetNamespace("other")
				return old, next
			},
			forward: true,
		},
		{
			name: "different kind",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				next.SetKind("Node")
				return old, next
			},
			forward: true,
		},
		{
			name: "different API version",
			prepare: func(old, next *unstructured.Unstructured) (interface{}, interface{}) {
				next.SetAPIVersion("example.io/v1")
				return old, next
			},
			forward: true,
		},
		{
			name: "nil old object",
			prepare: func(_, next *unstructured.Unstructured) (interface{}, interface{}) {
				return nil, next
			},
			forward: true,
		},
		{
			name: "typed nil old object",
			prepare: func(_, next *unstructured.Unstructured) (interface{}, interface{}) {
				return (*unstructured.Unstructured)(nil), next
			},
			forward: true,
		},
		{
			name: "unexpected old type",
			prepare: func(_, next *unstructured.Unstructured) (interface{}, interface{}) {
				return "not an object", next
			},
			forward: true,
		},
		{
			name: "nil new object",
			prepare: func(old, _ *unstructured.Unstructured) (interface{}, interface{}) {
				return old, nil
			},
		},
		{
			name: "typed nil new object",
			prepare: func(old, _ *unstructured.Unstructured) (interface{}, interface{}) {
				return old, (*unstructured.Unstructured)(nil)
			},
		},
		{
			name: "unexpected new type",
			prepare: func(old, _ *unstructured.Unstructured) (interface{}, interface{}) {
				return old, "not an object"
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			old := newTestPod("web", "default")
			old.SetUID("pod-uid")
			old.SetResourceVersion("42")
			next := old.DeepCopy()
			next.SetLabels(map[string]string{"app": "web"})
			var oldObj, newObj interface{} = old, next
			if tt.prepare != nil {
				oldObj, newObj = tt.prepare(old, next)
			}

			sink := newRecordingSink()
			target := testWatchTarget()
			makeEventHandler(context.Background(), target, testWatchRepresentation(), sink).UpdateFunc(oldObj, newObj)

			if !tt.forward {
				assert.Empty(t, sink.updates)
				assert.Empty(t, sink.states)
				return
			}
			require.Len(t, sink.updates, 1)
			payload := sink.updates[0]
			obj := newObj.(*unstructured.Unstructured)
			assert.Equal(t, target.Route, payload.Route)
			assert.Equal(t, obj.GetName(), payload.Record.Reference.Address.ID)
			assert.Equal(t, []resource.ScopeEntry{{Dimension: "namespace", Value: obj.GetNamespace()}}, payload.Record.Reference.Address.Scope)
			if obj.GetUID() == "" {
				assert.Nil(t, payload.Record.Reference.Incarnation)
			} else {
				require.NotNil(t, payload.Record.Reference.Incarnation)
				assert.Equal(t, string(obj.GetUID()), *payload.Record.Reference.Incarnation)
			}
			assert.Equal(t, obj.GetLabels(), payload.Metadata.Labels)
			body, err := resource.ValueFromNative(obj.Object)
			require.NoError(t, err)
			assert.Equal(t, body, payload.Record.Body)
		})
	}
}

func TestMakeEventHandler_AddReplayPreserved(t *testing.T) {
	pod := newTestPod("web", "default")
	pod.SetUID("pod-uid")
	pod.SetResourceVersion("42")
	sink := newRecordingSink()
	handler := makeEventHandler(context.Background(), testWatchTarget(), testWatchRepresentation(), sink)
	handler.AddFunc(pod)
	handler.AddFunc(pod)
	assert.Len(t, sink.Adds, 2, "initial ADD replay must not use update deduplication")
}

func TestWatch_ChangedAndEmptyVersionUpdates(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	pod := newTestPod("web", "default")
	pod.SetUID("pod-uid")
	pod.SetResourceVersion("42")
	cs := newWatchableClientSet(defaultGVRListKinds(), pod)
	sink := newRecordingSink()
	target := testWatchTarget()
	done := make(chan error, 1)
	go func() {
		done <- newBaseResourcer().Watch(ctx, cs, target, testWatchRepresentation(), sink)
	}()
	t.Cleanup(func() {
		cancel()
		select {
		case err := <-done:
			assert.NoError(t, err)
		case <-time.After(5 * time.Second):
			t.Error("Watch did not return after context cancellation")
		}
		cs.ShutdownInformers()
	})
	sink.WaitForState(t, target.Type, resource.WatchStateSynced, 5*time.Second)
	sink.WaitForAdds(t, 1, 5*time.Second)

	for i, version := range []string{"43", ""} {
		next := pod.DeepCopy()
		next.SetResourceVersion(version)
		next.SetLabels(map[string]string{"version": version})
		_, err := cs.DynamicClient.Resource(testGVR).Namespace("default").Update(ctx, next, metav1.UpdateOptions{})
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			sink.mu.Lock()
			defer sink.mu.Unlock()
			return len(sink.updates) >= i+1
		}, 5*time.Second, 5*time.Millisecond)
	}
	sink.mu.Lock()
	defer sink.mu.Unlock()
	assert.Len(t, sink.updates, 2)
}

func TestMakeEventHandler_ReplaySkipsConversion(t *testing.T) {
	pod := newTestPod("web", "default")
	pod.SetResourceVersion("42")
	// Unsupported native data makes conversion observable through error delivery.
	pod.Object["unsupported"] = make(chan struct{})
	sink := newRecordingSink()
	handler := makeEventHandler(context.Background(), testWatchTarget(), testWatchRepresentation(), sink)
	handler.UpdateFunc(pod, pod)
	assert.Empty(t, sink.states, "replays must skip conversion, not only sink delivery")
	handler.AddFunc(pod)
	require.Len(t, sink.states, 1, "ADD must still attempt conversion")
	assert.Equal(t, resource.WatchStateError, sink.states[0].State)
}
