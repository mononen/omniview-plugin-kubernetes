package resourcers

import (
	"context"
	"fmt"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"go.uber.org/zap"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	"k8s.io/apimachinery/pkg/runtime/schema"
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

// scaleTargetRefToResourceKey maps native API group and kind to logical Type.
var scaleTargetRefToResourceKey = map[string]string{
	"apps::Deployment":  "k8s:apps/deployments",
	"apps::StatefulSet": "k8s:apps/statefulsets",
}

// ResolveRelationships resolves runtime relationship instances for an HPA.
// It inspects spec.scaleTargetRef.kind and apiVersion to emit an edge only to the correct target.
func (h *HPAResourcer) ResolveRelationships(
	ctx context.Context,
	client *clients.ClientSet,
	request resource.RelationshipResolutionRequest,
) ([]resource.ResolvedRelationship, error) {
	namespace, err := nativeRequestNamespace(request.Source.Reference.Address.Scope)
	if err != nil {
		return nil, err
	}
	id := request.Source.Reference.Address.ID
	hpa, err := client.KubeClient.AutoscalingV2().HorizontalPodAutoscalers(namespace).Get(ctx, id, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get HPA %s: %w", id, err)
	}

	ref := hpa.Spec.ScaleTargetRef
	if ref.Name == "" {
		return nil, resource.NewError("INVALID_REQUEST", "HPA scaleTargetRef requires a name")
	}
	gv, err := schema.ParseGroupVersion(ref.APIVersion)
	if err != nil || gv.Version == "" {
		return nil, resource.NewError("UNSUPPORTED", "HPA scaleTargetRef API version is unsupported")
	}
	lookupKey := gv.Group + "::" + ref.Kind

	resourceKey, ok := scaleTargetRefToResourceKey[lookupKey]
	if !ok {
		return nil, resource.NewError("UNSUPPORTED", "HPA scaleTargetRef target is unsupported")
	}

	byTarget := descriptorByTarget(h.DeclareRelationships())
	desc, ok := byTarget[resourceKey]
	if !ok {
		return nil, resource.NewError("UNSUPPORTED", "HPA relationship descriptor is unavailable")
	}

	target, err := makeRef(request, resourceKey, ref.Name, namespace)
	if err != nil {
		return nil, err
	}

	return []resource.ResolvedRelationship{
		{
			Descriptor: desc,
			Targets: []resource.RelationshipTarget{
				target,
			},
		},
	}, nil
}
