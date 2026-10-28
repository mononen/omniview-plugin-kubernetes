package resourcers

import (
	"context"
	"testing"

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

	rels, err := resourcer.ResolveRelationships(context.Background(), cs, workloadGetRequest("node-1", ""))
	require.NoError(t, err)
	require.Len(t, rels, 1)

	assert.Equal(t, "k8s:/pods", rels[0].Descriptor.TargetType)
	// The fake client doesn't support field selectors, so all pods are returned.
	// In production, only node-1 pods would be returned.
	assert.GreaterOrEqual(t, len(rels[0].Targets), 2)
	for _, target := range rels[0].Targets {
		assert.Equal(t, "kubernetes", target.Reference.Address.Provider)
		assert.Equal(t, "test-cluster", target.Reference.Address.Authority)
		assert.Equal(t, "k8s:/pods", target.Reference.Address.Type)
		assert.Equal(t, "test-connection", target.Route.Connection)
		assert.Nil(t, target.Reference.Incarnation)
		require.Len(t, target.Reference.Address.Scope, 1)
		assert.Equal(t, "namespace", target.Reference.Address.Scope[0].Dimension)
	}
}

func TestNodeResourcer_ResolveRelationships_NoPods(t *testing.T) {
	fakeClient := fake.NewSimpleClientset()
	cs := &clients.ClientSet{KubeClient: fakeClient}

	logger := zap.NewNop().Sugar()
	resourcer := NewNodeResourcer(logger, WithRelationships(RelationshipTable()["k8s:/nodes"]))

	rels, err := resourcer.ResolveRelationships(context.Background(), cs, workloadGetRequest("node-1", ""))
	require.NoError(t, err)
	assert.Empty(t, rels)
}