package resource

import sdkresource "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

// kubeErrorClassifier preserves native Kubernetes error classification across
// the resource v2 transport. The host owns public-safe error presentation.
type kubeErrorClassifier struct{}

// Compile-time interface check.
var _ sdkresource.ErrorClassifier = (*kubeErrorClassifier)(nil)

// ClassifyError delegates to classifyResourceError in errors.go.
func (k *kubeErrorClassifier) ClassifyError(err error) error {
	return classifyResourceError(err)
}
