package resource

import (
	"context"
	"sort"
	"sync/atomic"
	"testing"
	"time"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	"github.com/omniviewdev/plugin-sdk/pkg/resource/types"
	pkgtypes "github.com/omniviewdev/plugin-sdk/pkg/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	fakedynamic "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/dynamic/dynamicinformer"
)

// --- test helpers ---

var podGVR = schema.GroupVersionResource{Group: "", Version: "v1", Resource: "pods"}

func podGVRListKinds() map[schema.GroupVersionResource]string {
	return map[schema.GroupVersionResource]string{podGVR: "PodList"}
}

func testPod(name, ns string) *unstructured.Unstructured {
	pod := &unstructured.Unstructured{}
	pod.SetGroupVersionKind(schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Pod"})
	pod.SetName(name)
	pod.SetNamespace(ns)
	return pod
}

func newTestClientSet(objects ...runtime.Object) *clients.ClientSet {
	scheme := runtime.NewScheme()
	dc := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(scheme, podGVRListKinds(), objects...)
	factory := dynamicinformer.NewDynamicSharedInformerFactory(dc, 0)
	return &clients.ClientSet{
		DynamicClient:          dc,
		DynamicInformerFactory: factory,
	}
}

func newTestHandle(cs *clients.ClientSet, connID string) *kubeInformerHandle {
	return &kubeInformerHandle{
		factory:    cs.DynamicInformerFactory,
		resources:  make(map[string]schema.GroupVersionResource),
		policies:   make(map[string]types.InformerSyncPolicy),
		gates:      make(map[string]*atomic.Bool),
		chans:      make(map[string]resourceChans),
		connection: connID,
	}
}

func newTestPluginCtx(connID string) *pkgtypes.PluginContext {
	return &pkgtypes.PluginContext{
		Context: context.Background(),
		Connection: &pkgtypes.Connection{
			ID: connID,
		},
	}
}

// podResource returns the ResourceMeta for core/v1/Pod.
func podResource() types.ResourceMeta {
	return types.ResourceMeta{Group: "core", Version: "v1", Kind: "Pod"}
}

// drainAdds reads all available payloads from the channel with a timeout.
func drainAdds(ch chan types.InformerAddPayload, timeout time.Duration) []types.InformerAddPayload {
	var items []types.InformerAddPayload
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	for {
		select {
		case p := <-ch:
			items = append(items, p)
			// Reset timer after each receive to collect burst
			if !timer.Stop() {
				<-timer.C
			}
			timer.Reset(200 * time.Millisecond)
		case <-timer.C:
			return items
		}
	}
}

// drainStates reads all available state events from the channel with a timeout.
func drainStates(ch chan types.InformerStateEvent, timeout time.Duration) []types.InformerStateEvent {
	var items []types.InformerStateEvent
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	for {
		select {
		case p := <-ch:
			items = append(items, p)
			if !timer.Stop() {
				<-timer.C
			}
			timer.Reset(200 * time.Millisecond)
		case <-timer.C:
			return items
		}
	}
}

// --- tests ---

// TestGatedStart_NoDataLoss verifies the core invariant: after Start completes,
// the frontend receives exactly one ADD event per resource that exists in the
// cluster — no duplicates, no missing items.
func TestGatedStart_NoDataLoss(t *testing.T) {
	// Seed the fake API server with 5 pods
	pods := []runtime.Object{
		testPod("pod-a", "default"),
		testPod("pod-b", "default"),
		testPod("pod-c", "kube-system"),
		testPod("pod-d", "kube-system"),
		testPod("pod-e", "monitoring"),
	}
	cs := newTestClientSet(pods...)
	h := newTestHandle(cs, "test-conn")

	addCh := make(chan types.InformerAddPayload, 100)
	updateCh := make(chan types.InformerUpdatePayload, 100)
	deleteCh := make(chan types.InformerDeletePayload, 100)
	stateCh := make(chan types.InformerStateEvent, 100)

	ctx := newTestPluginCtx("test-conn")
	err := h.RegisterResource(ctx, podResource(), types.SyncOnConnect, addCh, updateCh, deleteCh)
	require.NoError(t, err)

	// Start in background — this blocks until stopped
	stopCh := make(chan struct{})
	startDone := make(chan error, 1)
	go func() {
		startDone <- h.Start(context.Background(), stopCh, stateCh)
	}()

	// Collect ADD events
	adds := drainAdds(addCh, 5*time.Second)
	states := drainStates(stateCh, 2*time.Second)

	// Verify: exactly 5 ADD events, one per pod
	assert.Len(t, adds, 5, "should receive exactly one ADD per pod")

	names := make([]string, len(adds))
	for i, a := range adds {
		names[i] = a.ID
		assert.Equal(t, "test-conn", a.Connection)
		assert.Equal(t, "core::v1::Pod", a.Key)
	}
	sort.Strings(names)
	assert.Equal(t, []string{"pod-a", "pod-b", "pod-c", "pod-d", "pod-e"}, names)

	// Verify: state events include Syncing → Synced
	require.GreaterOrEqual(t, len(states), 2)
	assert.Equal(t, types.InformerStateSyncing, states[0].State)
	// Last state should be Synced with correct count
	last := states[len(states)-1]
	assert.Equal(t, types.InformerStateSynced, last.State)
	assert.Equal(t, 5, last.ResourceCount)

	// Clean up
	close(stopCh)
	<-startDone
}

// TestGatedStart_EventsSuppressedDuringSync verifies that the informer's
// built-in ADD events (fired during LIST) are suppressed by the gate.
// We verify this indirectly: the only ADDs received should come from our
// burst-send (all at once after sync), not trickling in one-by-one.
func TestGatedStart_EventsSuppressedDuringSync(t *testing.T) {
	pods := []runtime.Object{
		testPod("p1", "default"),
		testPod("p2", "default"),
		testPod("p3", "default"),
	}
	cs := newTestClientSet(pods...)
	h := newTestHandle(cs, "conn-1")

	addCh := make(chan types.InformerAddPayload, 100)
	updateCh := make(chan types.InformerUpdatePayload, 100)
	deleteCh := make(chan types.InformerDeletePayload, 100)
	stateCh := make(chan types.InformerStateEvent, 100)

	ctx := newTestPluginCtx("conn-1")
	require.NoError(t, h.RegisterResource(ctx, podResource(), types.SyncOnConnect, addCh, updateCh, deleteCh))

	// Verify gate starts closed
	h.mu.Lock()
	gate := h.gates["core::v1::Pod"]
	h.mu.Unlock()
	assert.False(t, gate.Load(), "gate should be closed before Start")

	stopCh := make(chan struct{})
	startDone := make(chan error, 1)
	go func() {
		startDone <- h.Start(context.Background(), stopCh, stateCh)
	}()

	// Wait for the Synced state event
	drainStates(stateCh, 5*time.Second)

	// Gate should now be open
	assert.True(t, gate.Load(), "gate should be open after sync")

	// All 3 adds should be present
	adds := drainAdds(addCh, 2*time.Second)
	assert.Len(t, adds, 3, "burst should contain all 3 pods")

	close(stopCh)
	<-startDone
}

// TestGatedStart_RealTimeEventsFlowAfterSync verifies that after the gate
// opens, new objects added to the cluster are forwarded to the frontend.
func TestGatedStart_RealTimeEventsFlowAfterSync(t *testing.T) {
	cs := newTestClientSet(testPod("existing", "default"))
	h := newTestHandle(cs, "conn-rt")

	addCh := make(chan types.InformerAddPayload, 100)
	updateCh := make(chan types.InformerUpdatePayload, 100)
	deleteCh := make(chan types.InformerDeletePayload, 100)
	stateCh := make(chan types.InformerStateEvent, 100)

	ctx := newTestPluginCtx("conn-rt")
	require.NoError(t, h.RegisterResource(ctx, podResource(), types.SyncOnConnect, addCh, updateCh, deleteCh))

	stopCh := make(chan struct{})
	startDone := make(chan error, 1)
	go func() {
		startDone <- h.Start(context.Background(), stopCh, stateCh)
	}()

	// Drain initial burst + states
	drainAdds(addCh, 5*time.Second)
	drainStates(stateCh, 2*time.Second)

	// Now simulate a new pod being added to the cluster AFTER sync
	newPod := testPod("late-arrival", "default")
	_, err := cs.DynamicClient.Resource(podGVR).Namespace("default").Create(
		context.Background(), newPod, metav1.CreateOptions{},
	)
	require.NoError(t, err)

	// The real-time ADD should come through since the gate is open
	adds := drainAdds(addCh, 5*time.Second)
	require.Len(t, adds, 1, "real-time ADD should flow after gate opens")
	assert.Equal(t, "late-arrival", adds[0].ID)

	close(stopCh)
	<-startDone
}

// TestGatedStart_UpdateAndDeleteFlowAfterSync verifies UPDATE and DELETE
// events work after the gate opens.
func TestGatedStart_UpdateAndDeleteFlowAfterSync(t *testing.T) {
	initialPod := testPod("mypod", "default")
	cs := newTestClientSet(initialPod)
	h := newTestHandle(cs, "conn-ud")

	addCh := make(chan types.InformerAddPayload, 100)
	updateCh := make(chan types.InformerUpdatePayload, 100)
	deleteCh := make(chan types.InformerDeletePayload, 100)
	stateCh := make(chan types.InformerStateEvent, 100)

	ctx := newTestPluginCtx("conn-ud")
	require.NoError(t, h.RegisterResource(ctx, podResource(), types.SyncOnConnect, addCh, updateCh, deleteCh))

	stopCh := make(chan struct{})
	startDone := make(chan error, 1)
	go func() {
		startDone <- h.Start(context.Background(), stopCh, stateCh)
	}()

	// Drain initial burst + states
	drainAdds(addCh, 5*time.Second)
	drainStates(stateCh, 2*time.Second)

	// Update the pod
	updatedPod := testPod("mypod", "default")
	updatedPod.SetLabels(map[string]string{"updated": "true"})
	_, err := cs.DynamicClient.Resource(podGVR).Namespace("default").Update(
		context.Background(), updatedPod, metav1.UpdateOptions{},
	)
	require.NoError(t, err)

	// Drain update event
	var updates []types.InformerUpdatePayload
	timer := time.NewTimer(5 * time.Second)
	select {
	case u := <-updateCh:
		updates = append(updates, u)
	case <-timer.C:
	}
	timer.Stop()
	require.Len(t, updates, 1, "UPDATE should flow after gate opens")
	assert.Equal(t, "mypod", updates[0].ID)

	// Delete the pod
	err = cs.DynamicClient.Resource(podGVR).Namespace("default").Delete(
		context.Background(), "mypod", metav1.DeleteOptions{},
	)
	require.NoError(t, err)

	var deletes []types.InformerDeletePayload
	timer2 := time.NewTimer(5 * time.Second)
	select {
	case d := <-deleteCh:
		deletes = append(deletes, d)
	case <-timer2.C:
	}
	timer2.Stop()
	require.Len(t, deletes, 1, "DELETE should flow after gate opens")
	assert.Equal(t, "mypod", deletes[0].ID)

	close(stopCh)
	<-startDone
}

// TestGatedStart_EmptyCluster verifies correct behavior when there are no
// resources to sync — should still emit Synced with count 0.
func TestGatedStart_EmptyCluster(t *testing.T) {
	cs := newTestClientSet() // no pods
	h := newTestHandle(cs, "conn-empty")

	addCh := make(chan types.InformerAddPayload, 100)
	updateCh := make(chan types.InformerUpdatePayload, 100)
	deleteCh := make(chan types.InformerDeletePayload, 100)
	stateCh := make(chan types.InformerStateEvent, 100)

	ctx := newTestPluginCtx("conn-empty")
	require.NoError(t, h.RegisterResource(ctx, podResource(), types.SyncOnConnect, addCh, updateCh, deleteCh))

	stopCh := make(chan struct{})
	startDone := make(chan error, 1)
	go func() {
		startDone <- h.Start(context.Background(), stopCh, stateCh)
	}()

	states := drainStates(stateCh, 5*time.Second)
	adds := drainAdds(addCh, 1*time.Second)

	// No pods → no ADD events
	assert.Empty(t, adds, "empty cluster should produce no ADD events")

	// Should still get Synced with count=0
	require.GreaterOrEqual(t, len(states), 2)
	last := states[len(states)-1]
	assert.Equal(t, types.InformerStateSynced, last.State)
	assert.Equal(t, 0, last.ResourceCount)

	close(stopCh)
	<-startDone
}

// TestGatedStartResource_NoDataLoss verifies StartResource (on-demand sync)
// also gates events properly and delivers all items via burst.
func TestGatedStartResource_NoDataLoss(t *testing.T) {
	pods := []runtime.Object{
		testPod("sr-1", "default"),
		testPod("sr-2", "default"),
	}
	cs := newTestClientSet(pods...)
	h := newTestHandle(cs, "conn-sr")

	addCh := make(chan types.InformerAddPayload, 100)
	updateCh := make(chan types.InformerUpdatePayload, 100)
	deleteCh := make(chan types.InformerDeletePayload, 100)
	stateCh := make(chan types.InformerStateEvent, 100)

	ctx := newTestPluginCtx("conn-sr")
	// Register with SyncOnFirstQuery so Start() doesn't sync it
	require.NoError(t, h.RegisterResource(ctx, podResource(), types.SyncOnFirstQuery, addCh, updateCh, deleteCh))

	// Start the factory (needed for StartResource to work)
	stopCh := make(chan struct{})
	h.mu.Lock()
	h.stopCh = stopCh
	h.mu.Unlock()

	// StartResource triggers on-demand sync
	startCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err := h.StartResource(startCtx, podResource(), stateCh)
	require.NoError(t, err)

	adds := drainAdds(addCh, 3*time.Second)
	states := drainStates(stateCh, 2*time.Second)

	assert.Len(t, adds, 2, "StartResource should deliver all items")
	names := []string{adds[0].ID, adds[1].ID}
	sort.Strings(names)
	assert.Equal(t, []string{"sr-1", "sr-2"}, names)

	// Should include Synced state
	var foundSynced bool
	for _, s := range states {
		if s.State == types.InformerStateSynced {
			foundSynced = true
			assert.Equal(t, 2, s.ResourceCount)
		}
	}
	assert.True(t, foundSynced, "should emit Synced state event")

	close(stopCh)
}
