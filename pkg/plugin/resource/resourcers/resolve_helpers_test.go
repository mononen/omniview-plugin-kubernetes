package resourcers

import (
	"context"
	"testing"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes/fake"
)

func TestExtractVolumeConfigMaps(t *testing.T) {
	tests := []struct {
		name     string
		spec     corev1.PodSpec
		expected []string
	}{
		{
			name:     "no volumes",
			spec:     corev1.PodSpec{},
			expected: nil,
		},
		{
			name: "no configmap volumes",
			spec: corev1.PodSpec{
				Volumes: []corev1.Volume{
					{Name: "vol", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
				},
			},
			expected: nil,
		},
		{
			name: "single configmap",
			spec: corev1.PodSpec{
				Volumes: []corev1.Volume{
					{Name: "cfg", VolumeSource: corev1.VolumeSource{ConfigMap: &corev1.ConfigMapVolumeSource{LocalObjectReference: corev1.LocalObjectReference{Name: "my-config"}}}},
				},
			},
			expected: []string{"my-config"},
		},
		{
			name: "multiple configmaps",
			spec: corev1.PodSpec{
				Volumes: []corev1.Volume{
					{Name: "cfg1", VolumeSource: corev1.VolumeSource{ConfigMap: &corev1.ConfigMapVolumeSource{LocalObjectReference: corev1.LocalObjectReference{Name: "config-a"}}}},
					{Name: "other", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
					{Name: "cfg2", VolumeSource: corev1.VolumeSource{ConfigMap: &corev1.ConfigMapVolumeSource{LocalObjectReference: corev1.LocalObjectReference{Name: "config-b"}}}},
				},
			},
			expected: []string{"config-a", "config-b"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractVolumeConfigMaps(tt.spec)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExtractVolumeSecrets(t *testing.T) {
	tests := []struct {
		name     string
		spec     corev1.PodSpec
		expected []string
	}{
		{
			name:     "no volumes",
			spec:     corev1.PodSpec{},
			expected: nil,
		},
		{
			name: "single secret",
			spec: corev1.PodSpec{
				Volumes: []corev1.Volume{
					{Name: "sec", VolumeSource: corev1.VolumeSource{Secret: &corev1.SecretVolumeSource{SecretName: "my-secret"}}},
				},
			},
			expected: []string{"my-secret"},
		},
		{
			name: "mixed volumes",
			spec: corev1.PodSpec{
				Volumes: []corev1.Volume{
					{Name: "sec1", VolumeSource: corev1.VolumeSource{Secret: &corev1.SecretVolumeSource{SecretName: "secret-a"}}},
					{Name: "empty", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
					{Name: "sec2", VolumeSource: corev1.VolumeSource{Secret: &corev1.SecretVolumeSource{SecretName: "secret-b"}}},
				},
			},
			expected: []string{"secret-a", "secret-b"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractVolumeSecrets(tt.spec)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExtractVolumePVCs(t *testing.T) {
	tests := []struct {
		name     string
		spec     corev1.PodSpec
		expected []string
	}{
		{
			name:     "no volumes",
			spec:     corev1.PodSpec{},
			expected: nil,
		},
		{
			name: "single PVC",
			spec: corev1.PodSpec{
				Volumes: []corev1.Volume{
					{Name: "data", VolumeSource: corev1.VolumeSource{PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{ClaimName: "my-pvc"}}},
				},
			},
			expected: []string{"my-pvc"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractVolumePVCs(tt.spec)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestListPodsByOwner(t *testing.T) {
	ownerUID := "test-uid-123"

	ownedPod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "owned-pod",
			Namespace: "default",
			OwnerReferences: []metav1.OwnerReference{
				{Kind: "Deployment", Name: "my-deploy", UID: types.UID(ownerUID)},
			},
		},
	}

	unownedPod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "unowned-pod",
			Namespace: "default",
		},
	}

	differentOwnerPod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "other-pod",
			Namespace: "default",
			OwnerReferences: []metav1.OwnerReference{
				{Kind: "ReplicaSet", Name: "some-rs", UID: "other-uid"},
			},
		},
	}

	fakeClient := fake.NewSimpleClientset(ownedPod, unownedPod, differentOwnerPod)
	cs := &clients.ClientSet{KubeClient: fakeClient}

	pods, err := listPodsByOwner(context.Background(), cs, "default", "Deployment", "my-deploy", ownerUID)
	require.NoError(t, err)
	require.Len(t, pods, 1)
	assert.Equal(t, "owned-pod", pods[0].Name)
}

func TestListPodsByOwner_Empty(t *testing.T) {
	fakeClient := fake.NewSimpleClientset()
	cs := &clients.ClientSet{KubeClient: fakeClient}

	pods, err := listPodsByOwner(context.Background(), cs, "default", "StatefulSet", "my-sts", "uid")
	require.NoError(t, err)
	assert.Empty(t, pods)
}

func TestMakeRef(t *testing.T) {
	source := podRequest("source-pod", "default")
	request := relationshipRequest(source, "k8s:/configmaps")
	ref, err := makeRef(request, "k8s:/configmaps", "my-config", "default", "config-uid")
	require.NoError(t, err)
	assert.Equal(t, "k8s:/configmaps", ref.Reference.Address.Type)
	assert.Equal(t, "my-config", ref.Reference.Address.ID)
	assert.Equal(t, source.Reference.Address.Scope, ref.Reference.Address.Scope)
	assert.Equal(t, source.Reference.Address.Provider, ref.Reference.Address.Provider)
	assert.Equal(t, request.Targets[0].Authority, ref.Reference.Address.Authority)
	assert.NotEqual(t, source.Reference.Address.Authority, ref.Reference.Address.Authority)
	assert.Equal(t, source.Route, ref.Route)
	require.NotNil(t, ref.Reference.Incarnation)
	assert.Equal(t, "config-uid", *ref.Reference.Incarnation)
}

func TestMakeRefRequiresAdmittedTargetBinding(t *testing.T) {
	source := podRequest("source-pod", "default")
	request := relationshipRequest(source, "k8s:/configmaps")
	allowed := []string{"other"}
	request.Targets[0].Scope = resource.QueryScope{{Dimension: "namespace", Match: resource.ScopeOneOf, Values: &allowed}}
	for _, test := range []struct {
		name    string
		request resource.RelationshipResolutionRequest
		code    string
	}{
		{"missing", relationshipRequest(source), "UNSUPPORTED"},
		{"outside scope", request, "UNSUPPORTED"},
		{"ambiguous", resource.RelationshipResolutionRequest{Source: source, Targets: []resource.ReadTarget{
			relationshipRequest(source, "k8s:/configmaps").Targets[0],
			relationshipRequest(source, "k8s:/configmaps").Targets[0],
		}}, "INVALID_REQUEST"},
	} {
		t.Run(test.name, func(t *testing.T) {
			_, err := makeRef(test.request, "k8s:/configmaps", "config", "default")
			require.Equal(t, test.code, resource.ErrorCode(err))
		})
	}
}
