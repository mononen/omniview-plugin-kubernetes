package resourcers

import (
	"context"
	"testing"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes/fake"
)

func newTestClientSet(objs ...runtime.Object) *clients.ClientSet {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = autoscalingv2.AddToScheme(scheme)
	_ = rbacv1.AddToScheme(scheme)

	fakeKube := fake.NewSimpleClientset(objs...)
	fakeDynamic := dynamicfake.NewSimpleDynamicClient(scheme, objs...)

	return &clients.ClientSet{
		KubeClient:    fakeKube,
		DynamicClient: fakeDynamic,
	}
}

func podRequest(id, namespace string) resource.GetRequest {
	return resource.GetRequest{Route: resource.AccessRoute{Connection: "test"}, Reference: resource.ResourceReference{Address: resource.ResourceAddress{Provider: "kubernetes", Authority: "test-cluster", Type: "k8s:/pods", ID: id, Scope: []resource.ScopeEntry{{Dimension: "namespace", Value: namespace}}}}, Representation: "native"}
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

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := zap.NewNop().Sugar()
	resourcer := NewPodResourcer(logger, WithRelationships(RelationshipTable()["k8s:/pods"]))

	rels, err := resourcer.ResolveRelationships(ctx, cs, relationshipRequest(podRequest("test-pod", "default"),
		"k8s:/nodes", "k8s:/persistentvolumeclaims", "k8s:/configmaps", "k8s:/secrets", "k8s:/serviceaccounts"))
	require.NoError(t, err)
	require.Len(t, rels, 5)
	for _, rel := range rels {
		assert.Equal(t, "fixture-host-target-authority:"+rel.Descriptor.TargetType, rel.Targets[0].Reference.Address.Authority)
		assert.NotEqual(t, "test-cluster", rel.Targets[0].Reference.Address.Authority)
	}

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

	logger := zap.NewNop().Sugar()
	resourcer := NewPodResourcer(logger, WithRelationships(RelationshipTable()["k8s:/pods"]))

	rels, err := resourcer.ResolveRelationships(ctx, cs, relationshipRequest(podRequest("bare-pod", "default"), "k8s:/nodes"))
	require.NoError(t, err)

	// Only the explicit Node reference exists.
	require.Len(t, rels, 1)
	assert.Equal(t, "k8s:/nodes", rels[0].Descriptor.TargetType)
}

func TestPodResourcer_ResolveRelationships_NotFound(t *testing.T) {
	cs := newTestClientSet() // no pods
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := zap.NewNop().Sugar()
	resourcer := NewPodResourcer(logger, WithRelationships(RelationshipTable()["k8s:/pods"]))

	_, err := resourcer.ResolveRelationships(ctx, cs, relationshipRequest(podRequest("nonexistent", "default")))
	require.Error(t, err)
}

func TestPodOwnerRelationshipIdentity(t *testing.T) {
	pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "child", Namespace: "ns",
		OwnerReferences: []metav1.OwnerReference{{APIVersion: "apps/v1", Kind: "ReplicaSet", Name: "parent", UID: "parent-uid"}}}}
	r := NewPodResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:/pods"]))
	request := podRequest("child", "ns")
	rels, err := r.ResolveRelationships(context.Background(), newTestClientSet(pod), relationshipRequest(request, "k8s:apps/replicasets"))
	require.NoError(t, err)
	require.Len(t, rels, 1)
	target := rels[0].Targets[0]
	assert.Equal(t, request.Route, target.Route)
	assert.Equal(t, request.Reference.Address.Provider, target.Reference.Address.Provider)
	assert.Equal(t, "fixture-host-target-authority:k8s:apps/replicasets", target.Reference.Address.Authority)
	assert.Equal(t, "k8s:apps/replicasets", target.Reference.Address.Type)
	assert.Equal(t, "parent", target.Reference.Address.ID)
	assert.Equal(t, request.Reference.Address.Scope, target.Reference.Address.Scope)
	require.NotNil(t, target.Reference.Incarnation)
	assert.Equal(t, "parent-uid", *target.Reference.Incarnation)
}

func TestRelationshipTargetUnknownIncarnation(t *testing.T) {
	source := podRequest("pod", "ns")
	target, err := makeRef(relationshipRequest(source, "k8s:/nodes"), "k8s:/nodes", "node", "")
	require.NoError(t, err)
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
	rels, err := r.ResolveRelationships(context.Background(), newTestClientSet(hpa), relationshipRequest(request, "k8s:apps/statefulsets"))
	require.NoError(t, err)
	require.Len(t, rels, 1)
	target := rels[0].Targets[0]
	assert.Equal(t, "k8s:apps/statefulsets", target.Reference.Address.Type)
	assert.Equal(t, "fixture-host-target-authority:k8s:apps/statefulsets", target.Reference.Address.Authority)
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
	rels, err := r.ResolveRelationships(context.Background(), newTestClientSet(binding), relationshipRequest(request, "k8s:rbac.authorization.k8s.io/clusterroles"))
	require.NoError(t, err)
	require.Len(t, rels, 1)
	target := rels[0].Targets[0]
	assert.Equal(t, "k8s:rbac.authorization.k8s.io/clusterroles", target.Reference.Address.Type)
	assert.Empty(t, target.Reference.Address.Scope)
	assert.Equal(t, "fixture-host-target-authority:k8s:rbac.authorization.k8s.io/clusterroles", target.Reference.Address.Authority)
}

func TestNativeRelationshipRequiresAdmittedTarget(t *testing.T) {
	cases := []struct {
		name       string
		source     resource.GetRequest
		targetType string
		object     runtime.Object
		resolve    func(context.Context, *clients.ClientSet, resource.RelationshipResolutionRequest) ([]resource.ResolvedRelationship, error)
	}{
		{
			name:       "pod owner",
			source:     podRequest("child", "ns"),
			targetType: "k8s:apps/replicasets",
			object: &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "child", Namespace: "ns",
				OwnerReferences: []metav1.OwnerReference{{APIVersion: "apps/v1", Kind: "ReplicaSet", Name: "parent", UID: "owner-uid"}}}},
			resolve: NewPodResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:/pods"])).ResolveRelationships,
		},
		{
			name:       "HPA target",
			source:     podRequest("scale", "ns"),
			targetType: "k8s:apps/statefulsets",
			object: &autoscalingv2.HorizontalPodAutoscaler{ObjectMeta: metav1.ObjectMeta{Name: "scale", Namespace: "ns"},
				Spec: autoscalingv2.HorizontalPodAutoscalerSpec{ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
					APIVersion: "apps/v1", Kind: "StatefulSet", Name: "db"}}},
			resolve: NewHPAResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:autoscaling/horizontalpodautoscalers"])).ResolveRelationships,
		},
		{
			name:       "RoleBinding role",
			source:     podRequest("binding", "ns"),
			targetType: "k8s:rbac.authorization.k8s.io/roles",
			object: &rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: "binding", Namespace: "ns"},
				RoleRef: rbacv1.RoleRef{APIGroup: "rbac.authorization.k8s.io", Kind: "Role", Name: "reader"}},
			resolve: NewRoleBindingResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:rbac.authorization.k8s.io/rolebindings"])).ResolveRelationships,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			switch tc.name {
			case "HPA target":
				tc.source.Reference.Address.Type = "k8s:autoscaling/horizontalpodautoscalers"
			case "RoleBinding role":
				tc.source.Reference.Address.Type = "k8s:rbac.authorization.k8s.io/rolebindings"
			}
			t.Run("admitted", func(t *testing.T) {
				rels, err := tc.resolve(context.Background(), newTestClientSet(tc.object), relationshipRequest(tc.source, tc.targetType))
				require.NoError(t, err)
				require.Len(t, rels, 1)
				require.Len(t, rels[0].Targets, 1)
				target := rels[0].Targets[0]
				assert.Equal(t, tc.targetType, target.Reference.Address.Type)
				assert.Equal(t, "fixture-host-target-authority:"+tc.targetType, target.Reference.Address.Authority)
				assert.NotEqual(t, tc.source.Reference.Address.Authority, target.Reference.Address.Authority)
				assert.Equal(t, tc.source.Reference.Address.Scope, target.Reference.Address.Scope)
			})
			t.Run("native acquisition fails", func(t *testing.T) {
				rels, err := tc.resolve(context.Background(), newTestClientSet(), relationshipRequest(tc.source, tc.targetType))
				require.Error(t, err)
				assert.Empty(t, rels)
			})
			t.Run("missing", func(t *testing.T) {
				rels, err := tc.resolve(context.Background(), newTestClientSet(tc.object), relationshipRequest(tc.source))
				require.Error(t, err)
				assert.Equal(t, "UNSUPPORTED", resource.ErrorCode(err))
				assert.Empty(t, rels)
			})
			t.Run("outside scope", func(t *testing.T) {
				request := relationshipRequest(tc.source, tc.targetType)
				values := []string{"other"}
				request.Targets[0].Scope = resource.QueryScope{{Dimension: "namespace", Match: resource.ScopeOneOf, Values: &values}}
				rels, err := tc.resolve(context.Background(), newTestClientSet(tc.object), request)
				require.Error(t, err)
				assert.Equal(t, "UNSUPPORTED", resource.ErrorCode(err))
				assert.Empty(t, rels)
			})
		})
	}
}

func TestNativeRelationshipRejectsUnresolvedLinks(t *testing.T) {
	for _, tc := range []struct {
		name       string
		kind       string
		apiVersion string
		targetName string
		code       string
	}{
		{"unknown kind", "Unknown", "apps/v1", "target", "UNSUPPORTED"},
		{"wrong group", "ReplicaSet", "example.com/v1", "target", "UNSUPPORTED"},
		{"empty name", "ReplicaSet", "apps/v1", "", "INVALID_REQUEST"},
	} {
		t.Run("pod/"+tc.name, func(t *testing.T) {
			pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "child", Namespace: "ns",
				OwnerReferences: []metav1.OwnerReference{{APIVersion: tc.apiVersion, Kind: tc.kind, Name: tc.targetName}}}}
			r := NewPodResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:/pods"]))
			rels, err := r.ResolveRelationships(context.Background(), newTestClientSet(pod), relationshipRequest(podRequest("child", "ns"), "k8s:apps/replicasets"))
			require.Error(t, err)
			assert.Equal(t, tc.code, resource.ErrorCode(err))
			assert.Empty(t, rels)
		})
	}
	for _, kind := range []string{"hpa", "rolebinding"} {
		for _, invalidName := range []bool{false, true} {
			t.Run(kind+map[bool]string{false: "/unknown target", true: "/empty name"}[invalidName], func(t *testing.T) {
				name := "target"
				code := "UNSUPPORTED"
				if invalidName {
					name = ""
					code = "INVALID_REQUEST"
				}
				source := podRequest("source", "ns")
				var rels []resource.ResolvedRelationship
				var err error
				if kind == "hpa" {
					source.Reference.Address.Type = "k8s:autoscaling/horizontalpodautoscalers"
					object := &autoscalingv2.HorizontalPodAutoscaler{ObjectMeta: metav1.ObjectMeta{Name: "source", Namespace: "ns"},
						Spec: autoscalingv2.HorizontalPodAutoscalerSpec{ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
							APIVersion: "example.com/v1", Kind: "Deployment", Name: name}}}
					r := NewHPAResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()[source.Reference.Address.Type]))
					rels, err = r.ResolveRelationships(context.Background(), newTestClientSet(object), relationshipRequest(source, "k8s:apps/deployments"))
				} else {
					source.Reference.Address.Type = "k8s:rbac.authorization.k8s.io/rolebindings"
					object := &rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: "source", Namespace: "ns"},
						RoleRef: rbacv1.RoleRef{APIGroup: "example.com", Kind: "Role", Name: name}}
					r := NewRoleBindingResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()[source.Reference.Address.Type]))
					rels, err = r.ResolveRelationships(context.Background(), newTestClientSet(object), relationshipRequest(source, "k8s:rbac.authorization.k8s.io/roles"))
				}
				require.Error(t, err)
				assert.Equal(t, code, resource.ErrorCode(err))
				assert.Empty(t, rels)
			})
		}
	}
}

func TestPodOwnerUsesLogicalGroupAcrossVersions(t *testing.T) {
	pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "child", Namespace: "ns",
		OwnerReferences: []metav1.OwnerReference{{APIVersion: "apps/v1beta2", Kind: "ReplicaSet", Name: "owner", UID: "uid"}}}}
	r := NewPodResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:/pods"]))
	rels, err := r.ResolveRelationships(context.Background(), newTestClientSet(pod), relationshipRequest(podRequest("child", "ns"), "k8s:apps/replicasets"))
	require.NoError(t, err)
	require.Len(t, rels, 1)
	assert.Equal(t, "k8s:apps/replicasets", rels[0].Targets[0].Reference.Address.Type)
	require.NotNil(t, rels[0].Targets[0].Reference.Incarnation)
	assert.Equal(t, "uid", *rels[0].Targets[0].Reference.Incarnation)
}
