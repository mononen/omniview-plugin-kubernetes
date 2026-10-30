package resourcers

import (
	"context"
	"errors"
	"testing"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	ktesting "k8s.io/client-go/testing"
)

func TestPodDebugRejectsNullAndUnsafeMountFields(t *testing.T) {
	cases := map[string]func(*debugTestInput){
		"null env value": func(i *debugTestInput) { i.Params["env"] = map[string]interface{}{"TOKEN": nil} },
		"null argv":      func(i *debugTestInput) { i.Params["command"] = []interface{}{"sh", nil} },
		"mount propagation": func(i *debugTestInput) {
			i.Params["volumeMounts"] = []interface{}{map[string]interface{}{"name": "data", "mountPath": "/inspect", "readOnly": true, "mountPropagation": "Bidirectional"}}
		},
		"relative mount": func(i *debugTestInput) {
			i.Params["volumeMounts"] = []interface{}{map[string]interface{}{"name": "data", "mountPath": "inspect", "readOnly": true}}
		},
		"duplicate mount paths": func(i *debugTestInput) {
			i.Params["volumeMounts"] = []interface{}{map[string]interface{}{"name": "data", "mountPath": "/inspect", "readOnly": true}, map[string]interface{}{"name": "data", "mountPath": "/inspect", "readOnly": true}}
		},
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			client := fake.NewSimpleClientset(debugPodFixture())
			input := debugInput()
			change(&input)
			_, err := callDebug(t, client, input)
			require.Error(t, err)
			assert.Zero(t, debugMutationCount(t, client))
		})
	}
}

func TestPodDebugReconcilesAcceptedLostResponse(t *testing.T) {
	client := fake.NewSimpleClientset(debugPodFixture())
	submissions := 0
	client.PrependReactor("update", "pods", func(action ktesting.Action) (bool, runtime.Object, error) {
		if action.GetSubresource() != "ephemeralcontainers" {
			return false, nil, nil
		}
		submissions++
		pod := action.(ktesting.UpdateAction).GetObject().(*corev1.Pod).DeepCopy()
		require.NoError(t, client.Tracker().Update(corev1.SchemeGroupVersion.WithResource("pods"), pod, pod.Namespace))
		return true, nil, errors.New("response lost after acceptance")
	})
	result, err := callDebug(t, client, debugInput())
	require.NoError(t, err)
	debugResult(t, result, true)
	assert.Equal(t, 1, submissions)
	pod, err := client.CoreV1().Pods("debug-test").Get(context.Background(), "app", metav1.GetOptions{})
	require.NoError(t, err)
	assert.Len(t, pod.Spec.EphemeralContainers, 2)
}

func TestPodDebugDoesNotAdoptReplacementAfterLostResponse(t *testing.T) {
	client := fake.NewSimpleClientset(debugPodFixture())
	client.PrependReactor("update", "pods", func(action ktesting.Action) (bool, runtime.Object, error) {
		if action.GetSubresource() != "ephemeralcontainers" {
			return false, nil, nil
		}
		pod := action.(ktesting.UpdateAction).GetObject().(*corev1.Pod).DeepCopy()
		pod.UID = "replacement-uid"
		require.NoError(t, client.Tracker().Update(corev1.SchemeGroupVersion.WithResource("pods"), pod, pod.Namespace))
		return true, nil, errors.New("response lost")
	})
	original := debugInput()
	_, err := callDebug(t, client, original)
	require.Error(t, err)
	assert.Equal(t, "PROVIDER_ERROR", resource.ErrorCode(err))
	var operationError *resource.ResourceOperationError
	require.ErrorAs(t, err, &operationError)
	require.ErrorContains(t, operationError.Err, "response lost")
	assert.Equal(t, "original-uid", original.Params["podUID"], "uncertainty must not adopt replacement UID")
	assert.Equal(t, "debugger-omniview-test", original.Params["name"], "inspection keeps the reserved name")
	observed, err := client.CoreV1().Pods(original.Namespace).Get(context.Background(), original.ID, metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, "replacement-uid", string(observed.UID), "manual inspection must distinguish the replacement from the reserved original")
	assert.Equal(t, 1, debugMutationCount(t, client))
}

func TestPodDebugReplaySurvivesStoppedTarget(t *testing.T) {
	client := fake.NewSimpleClientset(debugPodFixture())
	result, err := callDebug(t, client, debugInput())
	require.NoError(t, err)
	debugResult(t, result, true)
	pod, err := client.CoreV1().Pods("debug-test").Get(context.Background(), "app", metav1.GetOptions{})
	require.NoError(t, err)
	pod.Status.ContainerStatuses[0].State = corev1.ContainerState{Terminated: &corev1.ContainerStateTerminated{ExitCode: 1}}
	require.NoError(t, client.Tracker().Update(corev1.SchemeGroupVersion.WithResource("pods"), pod, pod.Namespace))
	result, err = callDebug(t, client, debugInput())
	require.NoError(t, err)
	debugResult(t, result, false)
	assert.Equal(t, 1, debugMutationCount(t, client), "replay must not create another container")
}

func TestPodDebugPreflightRejectionIsAuthoritative(t *testing.T) {
	for _, name := range []string{"invalid image", "stopped target", "changed UID"} {
		t.Run(name, func(t *testing.T) {
			pod := debugPodFixture()
			input := debugInput()
			switch name {
			case "invalid image":
				input.Params["image"] = ""
			case "stopped target":
				pod.Status.ContainerStatuses[0].State = corev1.ContainerState{}
			case "changed UID":
				pod.UID = "replacement"
			}
			client := fake.NewSimpleClientset(pod)
			_, err := callDebug(t, client, input)
			require.Error(t, err)
			assert.Equal(t, "INVALID_REQUEST", resource.ErrorCode(err))
			assert.Zero(t, debugMutationCount(t, client))
		})
	}
}

func TestPodDebugResultSurvivesGRPCTransport(t *testing.T) {
	client := fake.NewSimpleClientset(debugPodFixture())
	result, err := callDebug(t, client, debugInput())
	require.NoError(t, err)
	wire, err := resource.ToProtoValue(result)
	require.NoError(t, err)
	decoded, err := resource.FromProtoValue(wire)
	require.NoError(t, err)
	debugResult(t, decoded, true)
	native, err := resource.NativeFromValue(decoded)
	require.NoError(t, err)
	envelope := native.(map[string]any)
	pod := envelope["data"].(map[string]any)["pod"].(map[string]any)
	assert.Equal(t, "original-uid", pod["metadata"].(map[string]any)["uid"])
	containers := pod["spec"].(map[string]any)["ephemeralContainers"].([]any)
	require.Len(t, containers, 2)
	assert.Equal(t, "debugger-omniview-test", containers[1].(map[string]any)["name"])
	assert.Equal(t, "app", containers[1].(map[string]any)["targetContainerName"])
}

func TestPodDebugRejectsMismatchedReferenceUID(t *testing.T) {
	client := fake.NewSimpleClientset(debugPodFixture())
	request := debugActionRequest(t, debugInput())
	uid := "different-reference-uid"
	request.Reference.Incarnation = &uid
	executor, ok := interface{}(NewPodResourcer(zap.NewNop().Sugar())).(podDebugActionExecutor)
	require.True(t, ok)
	_, err := executor.ExecuteAction(context.Background(), &clients.ClientSet{KubeClient: client}, request)
	require.Error(t, err)
	assert.Equal(t, "INVALID_REQUEST", resource.ErrorCode(err))
	assert.Empty(t, client.Actions(), "reference mismatch must fail before native access")
	assert.Zero(t, debugMutationCount(t, client))
}
