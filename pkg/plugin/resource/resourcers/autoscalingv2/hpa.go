//nolint:gochecknoglobals,gomnd // column definitions are global
package autoscalingv2

import types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

var HPACols = []types.ColumnDefinition{
	{
		ID:        "targetRef",
		Header:    "Target Ref",
		Accessors: "$.spec.scaleTargetRef",
		Width:     200,
		ResourceLink: &types.ResourceLink{
			IDAccessor: "name",
			TypeAccessor: "kind",
			TypeMap: map[string]string{
				"ReplicaSet": "k8s:apps/replicasets",
				"ReplicationController": "k8s:/replicationcontrollers",
				"Deployment": "k8s:apps/deployments",
				"StatefulSet": "k8s:apps/statefulsets",
				"DaemonSet": "k8s:apps/daemonsets",
				"Job": "k8s:batch/jobs",
				"CronJob": "k8s:batch/cronjobs",
			},
			ScopeAccessors: []types.ScopeExtractor{{Dimension: "namespace", FieldPath: "$.metadata.namespace"}},
			DisplayID: true,
		},
	},
	{
		ID:        "minReplicas",
		Header:    "Min",
		Accessors: "spec.minReplicas",
		Width:     70,
	},
	{
		ID:        "maxReplicas",
		Header:    "Max",
		Accessors: "spec.maxReplicas",
		Width:     70,
	},
	{
		ID:        "currentReplicas",
		Header:    "Current",
		Accessors: "status.currentReplicas",
		Width:     80,
	},
	{
		ID:        "desiredReplicas",
		Header:    "Desired",
		Accessors: "status.desiredReplicas",
		Width:     80,
	},
	{
		ID:        "lastScaleTime",
		Header:    "Last Scale",
		Accessors: "status.lastScaleTime",
		Width:     120,
		Formatter: "AGE",
	},
}
