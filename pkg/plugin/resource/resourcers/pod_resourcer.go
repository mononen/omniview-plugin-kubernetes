package resourcers

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
)


// PodResourcer wraps KubernetesResourcerBase for Pods with health, events, and relationships.
type PodResourcer struct {
	*KubernetesResourcerBase[MetaAccessor]
	log *zap.SugaredLogger
}

// NewPodResourcer creates a PodResourcer for k8s:/pods.
func NewPodResourcer(logger *zap.SugaredLogger, opts ...Option) *PodResourcer {
	base := NewKubernetesResourcerBase[MetaAccessor](
		logger,
		corev1.SchemeGroupVersion.WithResource("pods"),
		opts...,
	)
	return &PodResourcer{
		KubernetesResourcerBase: base,
		log:                     logger.Named("PodResourcer"),
	}
}

// ResolveRelationships resolves runtime relationship instances for a Pod.
func (p *PodResourcer) ResolveRelationships(
	ctx context.Context,
	client *clients.ClientSet,
	request resource.GetRequest,
) ([]resource.ResolvedRelationship, error) {
	namespace, err := nativeRequestNamespace(request.Reference.Address.Scope)
	if err != nil { return nil, err }
	id := request.Reference.Address.ID
	pod, err := client.KubeClient.CoreV1().Pods(namespace).Get(ctx, id, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod %s: %w", id, err)
	}

	var rels []resource.ResolvedRelationship
	byTarget := descriptorByTarget(p.DeclareRelationships())
	for _, owner := range pod.OwnerReferences {
		targetType := ""
		switch owner.APIVersion + "/" + owner.Kind {
		case "apps/v1/ReplicaSet": targetType = "k8s:apps/replicasets"
		case "apps/v1/DaemonSet": targetType = "k8s:apps/daemonsets"
		case "apps/v1/StatefulSet": targetType = "k8s:apps/statefulsets"
		case "batch/v1/Job": targetType = "k8s:batch/jobs"
		}
		if descriptor, ok := byTarget[targetType]; ok && owner.Name != "" {
			rels = append(rels, resource.ResolvedRelationship{Descriptor: descriptor,
				Targets: []resource.RelationshipTarget{makeRef(request, targetType, owner.Name, namespace, string(owner.UID))}})
		}
	}

	// Node relationship.
	if pod.Spec.NodeName != "" {
		rels = append(rels, resource.ResolvedRelationship{
			Descriptor: byTarget["k8s:/nodes"],
			Targets:    []resource.RelationshipTarget{makeRef(request, "k8s:/nodes", pod.Spec.NodeName, "")},
		})
	}

	// PVC relationships.
	if pvcs := extractVolumePVCs(pod.Spec); len(pvcs) > 0 {
		targets := make([]resource.RelationshipTarget, 0, len(pvcs))
		for _, name := range pvcs {
			targets = append(targets, makeRef(request, "k8s:/persistentvolumeclaims", name, namespace))
		}
		rels = append(rels, resource.ResolvedRelationship{
			Descriptor: byTarget["k8s:/persistentvolumeclaims"],
			Targets:    targets,
		})
	}

	// ConfigMap relationships.
	if cms := extractVolumeConfigMaps(pod.Spec); len(cms) > 0 {
		targets := make([]resource.RelationshipTarget, 0, len(cms))
		for _, name := range cms {
			targets = append(targets, makeRef(request, "k8s:/configmaps", name, namespace))
		}
		rels = append(rels, resource.ResolvedRelationship{
			Descriptor: byTarget["k8s:/configmaps"],
			Targets:    targets,
		})
	}

	// Secret relationships.
	if secrets := extractVolumeSecrets(pod.Spec); len(secrets) > 0 {
		targets := make([]resource.RelationshipTarget, 0, len(secrets))
		for _, name := range secrets {
			targets = append(targets, makeRef(request, "k8s:/secrets", name, namespace))
		}
		rels = append(rels, resource.ResolvedRelationship{
			Descriptor: byTarget["k8s:/secrets"],
			Targets:    targets,
		})
	}

	// ServiceAccount relationship.
	if pod.Spec.ServiceAccountName != "" {
		rels = append(rels, resource.ResolvedRelationship{
			Descriptor: byTarget["k8s:/serviceaccounts"],
			Targets:    []resource.RelationshipTarget{makeRef(request, "k8s:/serviceaccounts", pod.Spec.ServiceAccountName, namespace)},
		})
	}

	return rels, nil
}

// AssessHealth determines the health status of a Pod.
func (p *PodResourcer) AssessHealth(_ context.Context, _ *clients.ClientSet, _ resource.GetRequest, data resource.Value) (*resource.ResourceHealth, error) {
	var pod corev1.Pod
	raw, err := resource.NativeFromValue(data)
	if err != nil { return nil, err }
	body, err := json.Marshal(raw)
	if err != nil { return nil, err }
	if err := json.Unmarshal(body, &pod); err != nil {
		return nil, fmt.Errorf("failed to unmarshal pod: %w", err)
	}

	health := &resource.ResourceHealth{
		Status: resource.HealthUnknown,
	}

	// Check phase
	switch pod.Status.Phase {
	case corev1.PodRunning:
		health.Status = resource.HealthHealthy
		health.Reason = "Running"
	case corev1.PodSucceeded:
		health.Status = resource.HealthHealthy
		health.Reason = "Succeeded"
	case corev1.PodPending:
		health.Status = resource.HealthPending
		health.Reason = "Pending"
	case corev1.PodFailed:
		health.Status = resource.HealthUnhealthy
		health.Reason = "Failed"
		if pod.Status.Message != "" {
			health.Message = pod.Status.Message
		}
	}

	// Check container statuses for CrashLoopBackOff or restarts
	assessContainerStatus := func(cs corev1.ContainerStatus) {
		if cs.State.Waiting != nil {
			switch cs.State.Waiting.Reason {
			case "CrashLoopBackOff":
				health.Status = resource.HealthUnhealthy
				health.Reason = "CrashLoopBackOff"
				health.Message = fmt.Sprintf("Container %s is in CrashLoopBackOff", cs.Name)
			case "ImagePullBackOff", "ErrImagePull":
				health.Status = resource.HealthUnhealthy
				health.Reason = cs.State.Waiting.Reason
				health.Message = fmt.Sprintf("Container %s: %s", cs.Name, cs.State.Waiting.Message)
			case "ContainerCreating", "PodInitializing":
				if health.Status != resource.HealthUnhealthy {
					health.Status = resource.HealthPending
					health.Reason = cs.State.Waiting.Reason
				}
			}
		}

		if cs.RestartCount > 5 && health.Status == resource.HealthHealthy {
			health.Status = resource.HealthDegraded
			health.Reason = "HighRestarts"
			health.Message = fmt.Sprintf("Container %s has restarted %d times", cs.Name, cs.RestartCount)
		}
	}

	for _, cs := range pod.Status.InitContainerStatuses {
		assessContainerStatus(cs)
	}
	for _, cs := range pod.Status.ContainerStatuses {
		assessContainerStatus(cs)
	}

	// Conditions — also use the Ready condition to inform overall health.
	for _, c := range pod.Status.Conditions {
		lt := c.LastTransitionTime.Time
		health.Conditions = append(health.Conditions, resource.HealthCondition{
			Type:               string(c.Type),
			Status:             string(c.Status),
			Reason:             c.Reason,
			Message:            c.Message,
			LastTransitionTime: &lt,
		})

		if c.Type == corev1.PodReady && c.Status != corev1.ConditionTrue && pod.Status.Phase == corev1.PodRunning && health.Status != resource.HealthUnhealthy {
			health.Status = resource.HealthDegraded
			health.Reason = c.Reason
			if health.Reason == "" {
				health.Reason = "NotReady"
			}
			health.Message = c.Message
		}
	}

	if pod.Status.StartTime != nil {
		t := pod.Status.StartTime.Time
		health.Since = &t
	}

	return health, nil
}

// GetEvents returns Kubernetes events for a Pod, filtered by UID to avoid
// matching events from previous pod instances with the same name.
func (p *PodResourcer) GetEvents(ctx context.Context, client *clients.ClientSet, request resource.GetRequest, limit uint32) ([]resource.ResourceEvent, error) {
	namespace, err := nativeRequestNamespace(request.Reference.Address.Scope)
	if err != nil { return nil, err }
	id := request.Reference.Address.ID
	if client == nil || client.KubeClient == nil {
		return nil, fmt.Errorf("client is required for event retrieval")
	}

	pod, err := client.KubeClient.CoreV1().Pods(namespace).Get(ctx, id, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod %s for UID lookup: %w", id, err)
	}

	fieldSelector := fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Pod,involvedObject.uid=%s", id, pod.UID)
	return getK8sEvents(ctx, client, namespace, fieldSelector, limit)
}

// getK8sEvents is a shared helper for fetching Kubernetes events.
func getK8sEvents(ctx context.Context, client *clients.ClientSet, namespace, fieldSelector string, limit uint32) ([]resource.ResourceEvent, error) {
	if client == nil || client.KubeClient == nil {
		return nil, fmt.Errorf("client is required for event retrieval")
	}
	opts := metav1.ListOptions{
		FieldSelector: fieldSelector,
	}
	if limit > 0 {
		opts.Limit = int64(limit)
	}

	events, err := client.KubeClient.CoreV1().Events(namespace).List(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list events: %w", err)
	}

	result := make([]resource.ResourceEvent, 0, len(events.Items))
	for _, e := range events.Items {
		severity := resource.SeverityNormal
		if e.Type == "Warning" {
			severity = resource.SeverityWarning
		}

		re := resource.ResourceEvent{
			Type:    severity,
			Reason:  e.Reason,
			Message: e.Message,
			Source:  e.Source.Component,
			Count:   e.Count,
		}
		if !e.FirstTimestamp.IsZero() {
			re.FirstSeen = e.FirstTimestamp.Time
		} else if !e.EventTime.IsZero() {
			re.FirstSeen = e.EventTime.Time
		}
		if !e.LastTimestamp.IsZero() {
			re.LastSeen = e.LastTimestamp.Time
		} else {
			re.LastSeen = re.FirstSeen
		}
		result = append(result, re)
	}

	return result, nil
}
