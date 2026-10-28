package resourcers

import (
	"context"
	"testing"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/dynamic/dynamicinformer"
	"k8s.io/client-go/kubernetes/fake"
)

func newTestClientSet(objs ...runtime.Object) *clients.ClientSet {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = autoscalingv2.AddToScheme(scheme)
	_ = rbacv1.AddToScheme(scheme)

	fakeKube := fake.NewSimpleClientset(objs...)
	fakeDynamic := dynamicfake.NewSimpleDynamicClient(scheme, objs...)
	factory := dynamicinformer.NewDynamicSharedInformerFactory(fakeDynamic, 0)

	return &clients.ClientSet{
		KubeClient:             fakeKube,
		DynamicClient:          fakeDynamic,
		DynamicInformerFactory: factory,
	}
}

func podRequest(id, namespace string) resource.GetRequest {
 return resource.GetRequest{Route: resource.AccessRoute{Connection: "test"}, Reference: resource.ResourceReference{Address: resource.ResourceAddress{Provider: "kubernetes", Authority: "test-cluster", Type: "k8s:/pods", ID: id, Scope: []resource.ScopeEntry{{Dimension: "namespace", Value: namespace}}}}}
}

func TestPodResourcer_ResolveRelationships(t *testing.T) {
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-pod",
			Namespace: "default",
		},
		Spec: corev1.PodSpec{
			NodeName:           "node-1",
			ServiceAccountName: "my-sa",
			Containers:         []corev1.Container{{Name: "app", Image: "nginx"}},
			Volumes: []corev1.Volume{
				{Name: "pvc-vol", VolumeSource: corev1.VolumeSource{
					PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{ClaimName: "data-pvc"},
				}},
				{Name: "cm-vol", VolumeSource: corev1.VolumeSource{
					ConfigMap: &corev1.ConfigMapVolumeSource{
						LocalObjectReference: corev1.LocalObjectReference{Name: "app-config"},
					},
				}},
				{Name: "sec-vol", VolumeSource: corev1.VolumeSource{
					Secret: &corev1.SecretVolumeSource{SecretName: "app-secret"},
				}},
			},
		},
	}

	cs := newTestClientSet(pod)

	// Start the informer factory and wait for cache sync.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	gvr := schema.GroupVersionResource{Group: "", Version: "v1", Resource: "pods"}
	cs.DynamicInformerFactory.ForResource(gvr).Informer()
	cs.DynamicInformerFactory.Start(ctx.Done())
	cs.DynamicInformerFactory.WaitForCacheSync(ctx.Done())

	logger := zap.NewNop().Sugar()
	resourcer := NewPodResourcer(logger, WithRelationships(RelationshipTable()["k8s:/pods"]))

	rels, err := resourcer.ResolveRelationships(ctx, cs, podRequest("test-pod", "default"))
	require.NoError(t, err)
	require.Len(t, rels, 5)

	// Node
	assert.Equal(t, "k8s:/nodes", rels[0].Descriptor.TargetType)
	require.Len(t, rels[0].Targets, 1)
	assert.Equal(t, "node-1", rels[0].Targets[0].Reference.Address.ID)

	// PVC
	assert.Equal(t, "k8s:/persistentvolumeclaims", rels[1].Descriptor.TargetType)
	require.Len(t, rels[1].Targets, 1)
	assert.Equal(t, "data-pvc", rels[1].Targets[0].Reference.Address.ID)

	// ConfigMap
	assert.Equal(t, "k8s:/configmaps", rels[2].Descriptor.TargetType)
	require.Len(t, rels[2].Targets, 1)
	assert.Equal(t, "app-config", rels[2].Targets[0].Reference.Address.ID)

	// Secret
	assert.Equal(t, "k8s:/secrets", rels[3].Descriptor.TargetType)
	require.Len(t, rels[3].Targets, 1)
	assert.Equal(t, "app-secret", rels[3].Targets[0].Reference.Address.ID)

	// ServiceAccount
	assert.Equal(t, "k8s:/serviceaccounts", rels[4].Descriptor.TargetType)
	require.Len(t, rels[4].Targets, 1)
	assert.Equal(t, "my-sa", rels[4].Targets[0].Reference.Address.ID)
}

func TestPodResourcer_ResolveRelationships_NoVolumes(t *testing.T) {
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "bare-pod",
			Namespace: "default",
		},
		Spec: corev1.PodSpec{
			NodeName:   "node-1",
			Containers: []corev1.Container{{Name: "app", Image: "nginx"}},
		},
	}

	cs := newTestClientSet(pod)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	gvr := schema.GroupVersionResource{Group: "", Version: "v1", Resource: "pods"}
	cs.DynamicInformerFactory.ForResource(gvr).Informer()
	cs.DynamicInformerFactory.Start(ctx.Done())
	cs.DynamicInformerFactory.WaitForCacheSync(ctx.Done())

	logger := zap.NewNop().Sugar()
	resourcer := NewPodResourcer(logger, WithRelationships(RelationshipTable()["k8s:/pods"]))

	rels, err := resourcer.ResolveRelationships(ctx, cs, podRequest("bare-pod", "default"))
	require.NoError(t, err)

	// ServiceAccount name "default" is treated as the implicit default and skipped,
	// so only the Node relationship is expected.
	require.Len(t, rels, 1)
	assert.Equal(t, "k8s:/nodes", rels[0].Descriptor.TargetType)
}

func TestPodResourcer_ResolveRelationships_NotFound(t *testing.T) {
	cs := newTestClientSet() // no pods
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	gvr := schema.GroupVersionResource{Group: "", Version: "v1", Resource: "pods"}
	cs.DynamicInformerFactory.ForResource(gvr).Informer()
	cs.DynamicInformerFactory.Start(ctx.Done())
	cs.DynamicInformerFactory.WaitForCacheSync(ctx.Done())

	logger := zap.NewNop().Sugar()
	resourcer := NewPodResourcer(logger, WithRelationships(RelationshipTable()["k8s:/pods"]))

	_, err := resourcer.ResolveRelationships(ctx, cs, podRequest("nonexistent", "default"))
	require.Error(t, err)
}

func TestPodOwnerRelationshipIdentity(t *testing.T) {
	pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "child", Namespace: "ns",
		OwnerReferences: []metav1.OwnerReference{{APIVersion: "apps/v1", Kind: "ReplicaSet", Name: "parent", UID: "parent-uid"}}}}
	r := NewPodResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:/pods"]))
	request := podRequest("child", "ns")
	rels, err := r.ResolveRelationships(context.Background(), newTestClientSet(pod), request)
	require.NoError(t, err)
	require.Len(t, rels, 1)
	target := rels[0].Targets[0]
	assert.Equal(t, request.Route, target.Route)
	assert.Equal(t, request.Reference.Address.Provider, target.Reference.Address.Provider)
	assert.Equal(t, request.Reference.Address.Authority, target.Reference.Address.Authority)
	assert.Equal(t, "k8s:apps/replicasets", target.Reference.Address.Type)
	assert.Equal(t, "parent", target.Reference.Address.ID)
	assert.Equal(t, request.Reference.Address.Scope, target.Reference.Address.Scope)
	require.NotNil(t, target.Reference.Incarnation)
	assert.Equal(t, "parent-uid", *target.Reference.Incarnation)
}

func TestRelationshipTargetUnknownIncarnation(t *testing.T) {
	source := podRequest("pod", "ns")
	target := makeRef(source, "k8s:/nodes", "node", "")
	assert.Empty(t, target.Reference.Address.Scope)
	assert.Nil(t, target.Reference.Incarnation)
	assert.Equal(t, source.Route, target.Route)
}

func TestHPARelationshipUsesNativeTargetKind(t *testing.T) {
	hpa := &autoscalingv2.HorizontalPodAutoscaler{ObjectMeta: metav1.ObjectMeta{Name: "scale", Namespace: "ns"},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
			APIVersion: "apps/v1", Kind: "StatefulSet", Name: "db"}}}
	r := NewHPAResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:autoscaling/horizontalpodautoscalers"]))
	request := podRequest("scale", "ns")
	request.Reference.Address.Type = "k8s:autoscaling/horizontalpodautoscalers"
	rels, err := r.ResolveRelationships(context.Background(), newTestClientSet(hpa), request)
	require.NoError(t, err)
	require.Len(t, rels, 1)
	target := rels[0].Targets[0]
	assert.Equal(t, "k8s:apps/statefulsets", target.Reference.Address.Type)
	assert.Equal(t, "db", target.Reference.Address.ID)
	assert.Equal(t, request.Reference.Address.Scope, target.Reference.Address.Scope)
	assert.Nil(t, target.Reference.Incarnation)
}

func TestRoleBindingRelationshipClusterScope(t *testing.T) {
	binding := &rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: "binding", Namespace: "ns"},
		RoleRef: rbacv1.RoleRef{APIGroup: "rbac.authorization.k8s.io", Kind: "ClusterRole", Name: "reader"}}
	r := NewRoleBindingResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:rbac.authorization.k8s.io/rolebindings"]))
	request := podRequest("binding", "ns")
	request.Reference.Address.Type = "k8s:rbac.authorization.k8s.io/rolebindings"
	rels, err := r.ResolveRelationships(context.Background(), newTestClientSet(binding), request)
	require.NoError(t, err)
	require.Len(t, rels, 1)
	target := rels[0].Targets[0]
	assert.Equal(t, "k8s:rbac.authorization.k8s.io/clusterroles", target.Reference.Address.Type)
	assert.Empty(t, target.Reference.Address.Scope)
	assert.Equal(t, request.Reference.Address.Authority, target.Reference.Address.Authority)
}
