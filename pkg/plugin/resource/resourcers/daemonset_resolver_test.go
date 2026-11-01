package resourcers

import (
	"context"
	"errors"
	"testing"

	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	k8stesting "k8s.io/client-go/testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes/fake"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
)

func TestDaemonSetResourcer_ResolveRelationships(t *testing.T) {
	ds := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "my-ds",
			Namespace: "kube-system",
			UID:       "ds-uid-456",
		},
		Spec: appsv1.DaemonSetSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "agent"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "agent"}},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{Name: "agent", Image: "agent:v1"}},
					Volumes: []corev1.Volume{
						{Name: "config", VolumeSource: corev1.VolumeSource{
							ConfigMap: &corev1.ConfigMapVolumeSource{
								LocalObjectReference: corev1.LocalObjectReference{Name: "agent-config"},
							},
						}},
						{Name: "certs", VolumeSource: corev1.VolumeSource{
							Secret: &corev1.SecretVolumeSource{SecretName: "agent-certs"},
						}},
					},
				},
			},
		},
	}

	pod1 := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "my-ds-node1",
			Namespace: "kube-system",
			OwnerReferences: []metav1.OwnerReference{
				{Kind: "DaemonSet", Name: "my-ds", UID: types.UID("ds-uid-456")},
			},
		},
	}
	pod2 := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "my-ds-node2",
			Namespace: "kube-system",
			OwnerReferences: []metav1.OwnerReference{
				{Kind: "DaemonSet", Name: "my-ds", UID: types.UID("ds-uid-456")},
			},
		},
	}

	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = appsv1.AddToScheme(scheme)

	fakeKube := fake.NewSimpleClientset(ds, pod1, pod2)
	fakeDynamic := dynamicfake.NewSimpleDynamicClient(scheme, ds)

	cs := &clients.ClientSet{
		KubeClient:    fakeKube,
		DynamicClient: fakeDynamic,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := zap.NewNop().Sugar()
	resourcer := NewDaemonSetResourcer(logger, WithRelationships(RelationshipTable()["k8s:apps/daemonsets"]))

	request := relationshipRequest(workloadGetRequest("my-ds", "kube-system"), "k8s:/pods", "k8s:/configmaps", "k8s:/secrets")
	rels, err := resourcer.ResolveRelationships(ctx, cs, request)
	require.NoError(t, err)
	require.Len(t, rels, 3) // Pods, ConfigMap, Secret

	// Pods
	assert.Equal(t, "k8s:/pods", rels[0].Descriptor.TargetType)
	require.Len(t, rels[0].Targets, 2)
	assert.Equal(t, request.Targets[0].Authority, rels[0].Targets[0].Reference.Address.Authority)
	assert.NotEqual(t, request.Source.Reference.Address.Authority, rels[0].Targets[0].Reference.Address.Authority)

	// ConfigMap
	assert.Equal(t, "k8s:/configmaps", rels[1].Descriptor.TargetType)
	require.Len(t, rels[1].Targets, 1)
	assert.Equal(t, "agent-config", rels[1].Targets[0].Reference.Address.ID)

	// Secret
	assert.Equal(t, "k8s:/secrets", rels[2].Descriptor.TargetType)
	require.Len(t, rels[2].Targets, 1)
	assert.Equal(t, "agent-certs", rels[2].Targets[0].Reference.Address.ID)

	request.Targets = nil
	rels, err = resourcer.ResolveRelationships(ctx, cs, request)
	assert.Empty(t, rels)
	assert.Equal(t, "UNSUPPORTED", resource.ErrorCode(err))

	fakeKube.PrependReactor("list", "pods", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, errors.New("pod list denied")
	})
	rels, err = resourcer.ResolveRelationships(ctx, cs, request)
	assert.Empty(t, rels)
	require.ErrorContains(t, err, "pod list denied")
}

func TestDaemonSetResourcer_ResolveRelationships_NoPods(t *testing.T) {
	ds := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "empty-ds",
			Namespace: "default",
			UID:       "empty-uid",
		},
		Spec: appsv1.DaemonSetSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "empty"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "empty"}},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{Name: "app", Image: "nginx"}},
				},
			},
		},
	}

	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = appsv1.AddToScheme(scheme)

	fakeKube := fake.NewSimpleClientset(ds)
	fakeDynamic := dynamicfake.NewSimpleDynamicClient(scheme, ds)

	cs := &clients.ClientSet{
		KubeClient:    fakeKube,
		DynamicClient: fakeDynamic,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := zap.NewNop().Sugar()
	resourcer := NewDaemonSetResourcer(logger, WithRelationships(RelationshipTable()["k8s:apps/daemonsets"]))

	rels, err := resourcer.ResolveRelationships(ctx, cs, relationshipRequest(workloadGetRequest("empty-ds", "default"), "k8s:/pods"))
	require.NoError(t, err)
	assert.Empty(t, rels)
}
