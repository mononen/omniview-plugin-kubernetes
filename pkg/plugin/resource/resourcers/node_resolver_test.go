package resourcers

import (
	"context"
	"testing"
	"errors"

	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"k8s.io/apimachinery/pkg/runtime"
	k8stesting "k8s.io/client-go/testing"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)


func TestNodeResourcer_ResolveRelationships(t *testing.T) {
	pod1 := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "pod-1", Namespace: "default"},
		Spec:       corev1.PodSpec{NodeName: "node-1"},
	}
	pod2 := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "pod-2", Namespace: "kube-system"},
		Spec:       corev1.PodSpec{NodeName: "node-1"},
	}
	pod3 := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "pod-3", Namespace: "default"},
		Spec:       corev1.PodSpec{NodeName: "node-2"},
	}

	fakeClient := fake.NewSimpleClientset(pod1, pod2, pod3)
	cs := &clients.ClientSet{KubeClient: fakeClient}

	logger := zap.NewNop().Sugar()
	resourcer := NewNodeResourcer(logger, WithRelationships(RelationshipTable()["k8s:/nodes"]))

	request := relationshipRequest(workloadGetRequest("node-1", ""), "k8s:/pods")
	rels, err := resourcer.ResolveRelationships(context.Background(), cs, request)
	require.NoError(t, err)
	require.Len(t, rels, 1)

	assert.Equal(t, "k8s:/pods", rels[0].Descriptor.TargetType)
	// The fake client doesn't support field selectors, so all pods are returned.
	// In production, only node-1 pods would be returned.
	assert.GreaterOrEqual(t, len(rels[0].Targets), 2)
	for _, target := range rels[0].Targets {
		assert.Equal(t, "kubernetes", target.Reference.Address.Provider)
		assert.Equal(t, request.Targets[0].Authority, target.Reference.Address.Authority)
		assert.NotEqual(t, request.Source.Reference.Address.Authority, target.Reference.Address.Authority)
		assert.Equal(t, "k8s:/pods", target.Reference.Address.Type)
		assert.Equal(t, "test-connection", target.Route.Connection)
		assert.Nil(t, target.Reference.Incarnation)
		require.Len(t, target.Reference.Address.Scope, 1)
		assert.Equal(t, "namespace", target.Reference.Address.Scope[0].Dimension)
	}

	request.Targets = nil
	rels, err = resourcer.ResolveRelationships(context.Background(), cs, request)
	assert.Empty(t, rels)
	assert.Equal(t, "UNSUPPORTED", resource.ErrorCode(err))

	fakeClient.PrependReactor("list", "pods", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, errors.New("pod list denied")
	})
	rels, err = resourcer.ResolveRelationships(context.Background(), cs, request)
	assert.Empty(t, rels)
	require.ErrorContains(t, err, "pod list denied")
}

func TestNodeResourcer_ResolveRelationships_NoPods(t *testing.T) {
	fakeClient := fake.NewSimpleClientset()
	cs := &clients.ClientSet{KubeClient: fakeClient}

	logger := zap.NewNop().Sugar()
	resourcer := NewNodeResourcer(logger, WithRelationships(RelationshipTable()["k8s:/nodes"]))

	rels, err := resourcer.ResolveRelationships(context.Background(), cs, relationshipRequest(workloadGetRequest("node-1", ""), "k8s:/pods"))
	require.NoError(t, err)
	assert.Empty(t, rels)
}