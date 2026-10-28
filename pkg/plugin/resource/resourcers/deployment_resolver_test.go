package resourcers

import (
	"context"
	"testing"
	"errors"

	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	k8stesting "k8s.io/client-go/testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/dynamic/dynamicinformer"
	"k8s.io/client-go/kubernetes/fake"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
)


func TestDeploymentResourcer_ResolveRelationships(t *testing.T) {
	replicas := int32(1)
	dep := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "my-deploy",
			Namespace: "default",
			UID:       "deploy-uid",
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "test"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "test"}},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{Name: "app", Image: "nginx"}},
					Volumes: []corev1.Volume{
						{Name: "config", VolumeSource: corev1.VolumeSource{
							ConfigMap: &corev1.ConfigMapVolumeSource{
								LocalObjectReference: corev1.LocalObjectReference{Name: "my-config"},
							},
						}},
						{Name: "secret", VolumeSource: corev1.VolumeSource{
							Secret: &corev1.SecretVolumeSource{SecretName: "my-secret"},
						}},
					},
				},
			},
		},
	}

	rs := &appsv1.ReplicaSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "my-deploy-abc123",
			Namespace: "default",
			Labels:    map[string]string{"app": "test"},
			OwnerReferences: []metav1.OwnerReference{
				{Kind: "Deployment", Name: "my-deploy", UID: "deploy-uid"},
			},
		},
	}

	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = appsv1.AddToScheme(scheme)

	staleRS := rs.DeepCopy()
	staleRS.Name = "my-deploy-stale"
	staleRS.OwnerReferences[0].UID = "previous-deploy-uid"
	fakeKube := fake.NewSimpleClientset(dep, rs, staleRS)
	fakeDynamic := dynamicfake.NewSimpleDynamicClient(scheme, dep)
	factory := dynamicinformer.NewDynamicSharedInformerFactory(fakeDynamic, 0)

	cs := &clients.ClientSet{
		KubeClient:             fakeKube,
		DynamicClient:          fakeDynamic,
		DynamicInformerFactory: factory,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	gvr := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
	factory.ForResource(gvr).Informer()
	factory.Start(ctx.Done())
	factory.WaitForCacheSync(ctx.Done())

	logger := zap.NewNop().Sugar()
	resourcer := NewDeploymentResourcer(logger, WithRelationships(RelationshipTable()["k8s:apps/deployments"]))

	request := relationshipRequest(workloadGetRequest("my-deploy", "default"), "k8s:apps/replicasets", "k8s:/configmaps", "k8s:/secrets")
	rels, err := resourcer.ResolveRelationships(ctx, cs, request)
	require.NoError(t, err)
	require.Len(t, rels, 3)

	// ReplicaSet
	assert.Equal(t, "k8s:apps/replicasets", rels[0].Descriptor.TargetType)
	require.Len(t, rels[0].Targets, 1)
	assert.Equal(t, "my-deploy-abc123", rels[0].Targets[0].Reference.Address.ID)
	assert.Equal(t, request.Targets[0].Authority, rels[0].Targets[0].Reference.Address.Authority)
	assert.NotEqual(t, request.Source.Reference.Address.Authority, rels[0].Targets[0].Reference.Address.Authority)

	// ConfigMap
	assert.Equal(t, "k8s:/configmaps", rels[1].Descriptor.TargetType)
	require.Len(t, rels[1].Targets, 1)
	assert.Equal(t, "my-config", rels[1].Targets[0].Reference.Address.ID)

	// Secret
	assert.Equal(t, "k8s:/secrets", rels[2].Descriptor.TargetType)
	require.Len(t, rels[2].Targets, 1)
	assert.Equal(t, "my-secret", rels[2].Targets[0].Reference.Address.ID)

	request.Targets = nil
	rels, err = resourcer.ResolveRelationships(ctx, cs, request)
	assert.Empty(t, rels)
	assert.Equal(t, "UNSUPPORTED", resource.ErrorCode(err))

	fakeKube.PrependReactor("list", "replicasets", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, errors.New("replicaset list denied")
	})
	rels, err = resourcer.ResolveRelationships(ctx, cs, request)
	assert.Empty(t, rels)
	require.ErrorContains(t, err, "replicaset list denied")
}

func TestDeploymentResourcer_ResolveRelationships_NoVolumes(t *testing.T) {
	replicas := int32(1)
	dep := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "bare-deploy",
			Namespace: "default",
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "bare"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "bare"}},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{Name: "app", Image: "nginx"}},
				},
			},
		},
	}

	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = appsv1.AddToScheme(scheme)

	fakeKube := fake.NewSimpleClientset(dep)
	fakeDynamic := dynamicfake.NewSimpleDynamicClient(scheme, dep)
	factory := dynamicinformer.NewDynamicSharedInformerFactory(fakeDynamic, 0)

	cs := &clients.ClientSet{
		KubeClient:             fakeKube,
		DynamicClient:          fakeDynamic,
		DynamicInformerFactory: factory,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	gvr := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
	factory.ForResource(gvr).Informer()
	factory.Start(ctx.Done())
	factory.WaitForCacheSync(ctx.Done())

	logger := zap.NewNop().Sugar()
	resourcer := NewDeploymentResourcer(logger, WithRelationships(RelationshipTable()["k8s:apps/deployments"]))

	rels, err := resourcer.ResolveRelationships(ctx, cs, relationshipRequest(workloadGetRequest("bare-deploy", "default"), "k8s:apps/replicasets"))
	require.NoError(t, err)
	// No ReplicaSets, no volumes → empty
	assert.Empty(t, rels)
}