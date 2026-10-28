package resource

import (
	"context"
	"errors"

	"github.com/omniview/kubernetes/pkg/utils/kubeauth"
	"github.com/omniviewdev/plugin-sdk/pkg/types"
)

// LoadBoundedResourceClients constructs resource-only clients without changing
// the unbounded clients used by logs, exec, and metrics.
func LoadBoundedResourceClients(ctx context.Context, conn *types.Connection) (*kubeauth.KubeClientBundle, error) {
	if conn == nil { return nil, errors.New("connection is required") }
	value, ok := conn.GetDataKey("kubeconfig")
	if !ok { return nil, errors.New("kubeconfig is required") }
	path, ok := value.(string)
	if !ok || path == "" { return nil, errors.New("kubeconfig must be a non-empty string") }
	return kubeauth.LoadResourceKubeClients(ctx, path, conn.ID)
}
