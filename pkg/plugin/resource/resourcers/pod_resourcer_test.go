package resourcers

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
)

// ====================== POD HEALTH ====================== //

func TestPodHealth_Running(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	pod := corev1.Pod{
		Status: corev1.PodStatus{Phase: corev1.PodRunning},
	}
	body, err := json.Marshal(pod)
	require.NoError(t, err)
	data := mustTestValue(t, body)

	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, data)
	require.NoError(t, err)
	assert.Equal(t, resource.HealthHealthy, health.Status)
	assert.Equal(t, "Running", health.Reason)
}

func TestPodHealth_Succeeded(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	pod := corev1.Pod{
		Status: corev1.PodStatus{Phase: corev1.PodSucceeded},
	}
	body, err := json.Marshal(pod)
	require.NoError(t, err)
	data := mustTestValue(t, body)

	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, data)
	require.NoError(t, err)
	assert.Equal(t, resource.HealthHealthy, health.Status)
	assert.Equal(t, "Succeeded", health.Reason)
}

func TestPodHealth_Pending(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	pod := corev1.Pod{
		Status: corev1.PodStatus{Phase: corev1.PodPending},
	}
	body, err := json.Marshal(pod)
	require.NoError(t, err)
	data := mustTestValue(t, body)

	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, data)
	require.NoError(t, err)
	assert.Equal(t, resource.HealthPending, health.Status)
	assert.Equal(t, "Pending", health.Reason)
}

func TestPodHealth_Failed(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	pod := corev1.Pod{
		Status: corev1.PodStatus{
			Phase:   corev1.PodFailed,
			Message: "OOMKilled",
		},
	}
	body, err := json.Marshal(pod)
	require.NoError(t, err)
	data := mustTestValue(t, body)

	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, data)
	require.NoError(t, err)
	assert.Equal(t, resource.HealthUnhealthy, health.Status)
	assert.Equal(t, "Failed", health.Reason)
	assert.Equal(t, "OOMKilled", health.Message)
}

func TestPodHealth_CrashLoopBackOff(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	pod := corev1.Pod{
		Status: corev1.PodStatus{
			Phase: corev1.PodRunning,
			ContainerStatuses: []corev1.ContainerStatus{
				{
					Name: "app",
					State: corev1.ContainerState{
						Waiting: &corev1.ContainerStateWaiting{Reason: "CrashLoopBackOff"},
					},
				},
			},
		},
	}
	body, err := json.Marshal(pod)
	require.NoError(t, err)
	data := mustTestValue(t, body)

	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, data)
	require.NoError(t, err)
	assert.Equal(t, resource.HealthUnhealthy, health.Status)
	assert.Equal(t, "CrashLoopBackOff", health.Reason)
	assert.Contains(t, health.Message, "app")
}

func TestPodHealth_ImagePullBackOff(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	pod := corev1.Pod{
		Status: corev1.PodStatus{
			Phase: corev1.PodPending,
			ContainerStatuses: []corev1.ContainerStatus{
				{
					Name: "app",
					State: corev1.ContainerState{
						Waiting: &corev1.ContainerStateWaiting{
							Reason:  "ImagePullBackOff",
							Message: "Back-off pulling image",
						},
					},
				},
			},
		},
	}
	body, err := json.Marshal(pod)
	require.NoError(t, err)
	data := mustTestValue(t, body)

	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, data)
	require.NoError(t, err)
	assert.Equal(t, resource.HealthUnhealthy, health.Status)
	assert.Equal(t, "ImagePullBackOff", health.Reason)
}

func TestPodHealth_HighRestarts(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	pod := corev1.Pod{
		Status: corev1.PodStatus{
			Phase: corev1.PodRunning,
			ContainerStatuses: []corev1.ContainerStatus{
				{
					Name:         "app",
					RestartCount: 10,
					State: corev1.ContainerState{
						Running: &corev1.ContainerStateRunning{},
					},
				},
			},
		},
	}
	body, err := json.Marshal(pod)
	require.NoError(t, err)
	data := mustTestValue(t, body)

	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, data)
	require.NoError(t, err)
	assert.Equal(t, resource.HealthDegraded, health.Status)
	assert.Equal(t, "HighRestarts", health.Reason)
	assert.Contains(t, health.Message, "10")
}

func TestPodHealth_ContainerCreating(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	pod := corev1.Pod{
		Status: corev1.PodStatus{
			Phase: corev1.PodPending,
			ContainerStatuses: []corev1.ContainerStatus{
				{
					Name: "app",
					State: corev1.ContainerState{
						Waiting: &corev1.ContainerStateWaiting{Reason: "ContainerCreating"},
					},
				},
			},
		},
	}
	body, err := json.Marshal(pod)
	require.NoError(t, err)
	data := mustTestValue(t, body)

	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, data)
	require.NoError(t, err)
	assert.Equal(t, resource.HealthPending, health.Status)
	assert.Equal(t, "ContainerCreating", health.Reason)
}

func TestPodHealth_StartTime(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	now := metav1.Now()
	pod := corev1.Pod{
		Status: corev1.PodStatus{
			Phase:     corev1.PodRunning,
			StartTime: &now,
		},
	}
	body, err := json.Marshal(pod)
	require.NoError(t, err)
	data := mustTestValue(t, body)

	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, data)
	require.NoError(t, err)
	assert.NotNil(t, health.Since)
}

func TestPodHealth_InvalidJSON(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar())
	health, err := r.AssessHealth(context.Background(), nil, resource.GetRequest{}, resource.Value{})
	assert.Error(t, err)
	assert.Nil(t, health)
}

// ====================== POD RELATIONSHIPS ====================== //

func TestPodRelationships(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:/pods"]))
	rels := r.DeclareRelationships()
	assert.Len(t, rels, 11)
}

func TestPodRelationships_Types(t *testing.T) {
	r := NewPodResourcer(zap.NewNop().Sugar(), WithRelationships(RelationshipTable()["k8s:/pods"]))
	rels := r.DeclareRelationships()

	// Verify all expected target keys are present.
	expectedTargets := map[string]bool{
		"k8s:apps/replicasets":        false,
		"k8s:apps/daemonsets":         false,
		"k8s:apps/statefulsets":       false,
		"k8s:batch/jobs":              false,
		"k8s:/nodes":                  false,
		"k8s:/serviceaccounts":        false,
		"k8s:/persistentvolumeclaims": false,
		"k8s:/configmaps":             false,
		"k8s:/secrets":                false,
	}
	for _, rel := range rels {
		expectedTargets[rel.TargetType] = true
		assert.NotNil(t, rel.Extractor, "extractor should be set for %s", rel.TargetType)
		assert.Equal(t, "fieldPath", rel.Extractor.Method)
		assert.NotEmpty(t, rel.Extractor.FieldPath)
	}
	for key, found := range expectedTargets {
		assert.True(t, found, "expected target key %s not found in relationships", key)
	}
}
