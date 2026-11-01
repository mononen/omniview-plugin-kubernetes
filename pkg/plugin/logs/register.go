package logs

import (
	"github.com/omniview/kubernetes/pkg/pluginid"
	"github.com/omniviewdev/plugin-sdk/pkg/sdk"
	"github.com/omniviewdev/plugin-sdk/pkg/v1/logs"
)

// Register registers the log capability with the Kubernetes plugin.
func Register(plugin *sdk.Plugin, borrow ClientBorrower) {
	logs.RegisterPlugin(plugin, logs.PluginOpts{
		Handlers: map[string]logs.Handler{
			"k8s:/pods": {
				Plugin:        pluginid.ID,
				Resource:      "k8s:/pods",
				Handler:       nativeHandler(borrow),
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
			"k8s:apps/deployments":  nativeResolver(borrow, DeploymentSourceResolver),
			"k8s:apps/statefulsets": nativeResolver(borrow, StatefulSetSourceResolver),
			"k8s:apps/daemonsets":   nativeResolver(borrow, DaemonSetSourceResolver),
			"k8s:apps/replicasets":  nativeResolver(borrow, ReplicaSetSourceResolver),
			"k8s:batch/jobs":        nativeResolver(borrow, JobSourceResolver),
			"k8s:batch/cronjobs":    nativeResolver(borrow, CronJobSourceResolver),
		},
	})
}
