package resourcers

import (
	"context"
	"fmt"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/omniview/kubernetes/pkg/plugin/resource/clients"
	resource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
	"go.uber.org/zap"
	rbacv1 "k8s.io/api/rbac/v1"
)

// RoleBindingResourcer wraps KubernetesResourcerBase for CRUD and adds
// kind-aware relationship resolution for RoleBinding → roleRef (Role or ClusterRole).
type RoleBindingResourcer struct {
	*KubernetesResourcerBase[MetaAccessor]
	log *zap.SugaredLogger
}

// NewRoleBindingResourcer creates a RoleBindingResourcer for k8s:rbac.authorization.k8s.io/rolebindings.
func NewRoleBindingResourcer(logger *zap.SugaredLogger, opts ...Option) *RoleBindingResourcer {
	base := NewKubernetesResourcerBase[MetaAccessor](
		logger,
		rbacv1.SchemeGroupVersion.WithResource("rolebindings"),
		opts...,
	)
	return &RoleBindingResourcer{
		KubernetesResourcerBase: base,
		log:                     logger.Named("RoleBindingResourcer"),
	}
}

// roleRefKindToResourceKey maps roleRef.kind to the internal resource key.
var roleRefKindToResourceKey = map[string]string{
	"Role":        "k8s:rbac.authorization.k8s.io/roles",
	"ClusterRole": "k8s:rbac.authorization.k8s.io/clusterroles",
}

// ResolveRelationships resolves runtime relationship instances for a RoleBinding.
// It inspects roleRef.kind to emit an edge to either Role or ClusterRole.
func (r *RoleBindingResourcer) ResolveRelationships(
	ctx context.Context,
	client *clients.ClientSet,
	request resource.RelationshipResolutionRequest,
) ([]resource.ResolvedRelationship, error) {
	namespace, err := nativeRequestNamespace(request.Source.Reference.Address.Scope)
	if err != nil {
		return nil, err
	}
	id := request.Source.Reference.Address.ID
	rb, err := client.KubeClient.RbacV1().RoleBindings(namespace).Get(ctx, id, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get RoleBinding %s: %w", id, err)
	}

	refKind := rb.RoleRef.Kind
	refName := rb.RoleRef.Name

	resourceKey, ok := roleRefKindToResourceKey[refKind]
	if refName == "" {
		return nil, resource.NewError("INVALID_REQUEST", "RoleBinding roleRef requires a name")
	}
	if !ok || rb.RoleRef.APIGroup != "rbac.authorization.k8s.io" {
		return nil, resource.NewError("UNSUPPORTED", "RoleBinding roleRef target is unsupported")
	}

	byTarget := descriptorByTarget(r.DeclareRelationships())
	desc, ok := byTarget[resourceKey]
	if !ok {
		return nil, resource.NewError("UNSUPPORTED", "RoleBinding relationship descriptor is unavailable")
	}

	// For ClusterRole targets, the ref is cluster-scoped so namespace is empty.
	targetNamespace := namespace
	if refKind == "ClusterRole" {
		targetNamespace = ""
	}

	target, err := makeRef(request, resourceKey, refName, targetNamespace)
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
