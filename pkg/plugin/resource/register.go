package resource

import (
	"fmt"

	"github.com/omniviewdev/plugin-sdk/pkg/sdk"
	"go.uber.org/zap"
)

// Register installs the single resource v2 boundary. Unrelated plugin services
// retain their existing transport version and independent registrations.
func Register(plugin *sdk.Plugin) {
	provider, err := newKubernetesProvider(zap.S())
	if err != nil { panic(fmt.Sprintf("failed to build resource provider: %v", err)) }
	sdk.RegisterResourcePlugin(plugin, provider)
}
