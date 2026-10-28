package logs

import (
	"github.com/omniviewdev/plugin-sdk/pkg/sdk"
	"github.com/omniviewdev/plugin-sdk/pkg/v1/logs"
)

// Register registers the log capability with the Kubernetes plugin.
func Register(plugin *sdk.Plugin) {
	logs.RegisterPlugin(plugin, logs.PluginOpts{
		Handlers: map[string]logs.Handler{
			"k8s:/pods": {
				Plugin:        "kubernetes",
				Resource:      "k8s:/pods",
				Handler:       PodLogHandler,
				SourceBuilder: PodSourceBuilder,
				TargetBuilder: logs.ActionTargetBuilder{
					Paths: []string{
						"$.spec.containers[*]",
						"$.spec.initContainers[*]",
						"$.spec.ephemeralContainers[*]",
					},
					Selectors:     map[string]string{"container": "$.name"},
					LabelSelector: "container",
				},
			},
		},
		SourceResolvers: map[string]logs.SourceResolver{
			"k8s:apps/deployments":  DeploymentSourceResolver,
			"k8s:apps/statefulsets": StatefulSetSourceResolver,
			"k8s:apps/daemonsets":   DaemonSetSourceResolver,
			"k8s:apps/replicasets":  ReplicaSetSourceResolver,
			"k8s:batch/jobs":        JobSourceResolver,
			"k8s:batch/cronjobs":    CronJobSourceResolver,
		},
	})
}
