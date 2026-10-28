package resourcers

import (
	"context"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"fmt"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"go.uber.org/zap"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
)

// HPAResourcer wraps KubernetesResourcerBase for CRUD and adds kind-aware
// relationship resolution for HorizontalPodAutoscaler → scaleTargetRef.
type HPAResourcer struct {
	*KubernetesResourcerBase[MetaAccessor]
	log *zap.SugaredLogger
}


// NewHPAResourcer creates an HPAResourcer for k8s:autoscaling/horizontalpodautoscalers.
func NewHPAResourcer(logger *zap.SugaredLogger, opts ...Option) *HPAResourcer {
	base := NewKubernetesResourcerBase[MetaAccessor](
		logger,
		autoscalingv2.SchemeGroupVersion.WithResource("horizontalpodautoscalers"),
		opts...,
	)
	return &HPAResourcer{
		KubernetesResourcerBase: base,
		log:                     logger.Named("HPAResourcer"),
	}
}

// scaleTargetRefToResourceKey maps the HPA scaleTargetRef apiVersion+kind to
// the internal resource key used by the relationship table. Keys use the form
// "apiVersion::Kind" to avoid mis-resolving HPAs that target a different API group.
var scaleTargetRefToResourceKey = map[string]string{
	"apps/v1::Deployment":  "k8s:apps/deployments",
	"apps/v1::StatefulSet": "k8s:apps/statefulsets",
}

// ResolveRelationships resolves runtime relationship instances for an HPA.
// It inspects spec.scaleTargetRef.kind and apiVersion to emit an edge only to the correct target.
func (h *HPAResourcer) ResolveRelationships(
	ctx context.Context,
	client *clients.ClientSet,
	request resource.GetRequest,
) ([]resource.ResolvedRelationship, error) {
	namespace, err := nativeRequestNamespace(request.Reference.Address.Scope)
	if err != nil { return nil, err }
	id := request.Reference.Address.ID
	hpa, err := client.KubeClient.AutoscalingV2().HorizontalPodAutoscalers(namespace).Get(ctx, id, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get HPA %s: %w", id, err)
	}

	ref := hpa.Spec.ScaleTargetRef
	lookupKey := ref.APIVersion + "::" + ref.Kind

	resourceKey, ok := scaleTargetRefToResourceKey[lookupKey]
	if !ok || ref.Name == "" {
		h.log.Debugw("skipping HPA relationship: unmapped scaleTargetRef or empty name",
			"id", id, "namespace", namespace, "lookupKey", lookupKey,
			"apiVersion", ref.APIVersion, "kind", ref.Kind, "name", ref.Name,
			"mapped", ok)
		return nil, nil
	}

	byTarget := descriptorByTarget(h.DeclareRelationships())
	desc, ok := byTarget[resourceKey]
	if !ok {
		return nil, fmt.Errorf("missing relationship descriptor for %s; ensure WithRelationships(RelationshipTable()[\"k8s:autoscaling/horizontalpodautoscalers\"]) is provided", resourceKey)
	}

	return []resource.ResolvedRelationship{
		{
			Descriptor: desc,
			Targets: []resource.RelationshipTarget{
				makeRef(request, resourceKey, ref.Name, namespace),
			},
		},
	}, nil
}
