//nolint:gochecknoglobals,gomnd // column definitions are global
package appsv1

import types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

var DeploymentCols = []types.ColumnDefinition{
	{
		ID:        "availableReplicas",
		Header:    "Available",
		Accessors: "status.availableReplicas",
		Width:     80,
	},
	{
		ID:        "replicas",
		Header:    "Replicas",
		Accessors: "status.replicas",
		Width:     80,
	},
	{
		ID:        "readyReplicas",
		Header:    "Ready",
		Accessors: "status.readyReplicas",
		Width:     80,
	},
	{
		ID:        "updatedReplicas",
		Header:    "Updated",
		Accessors: "status.updatedReplicas",
		Width:     80,
		Hidden:    true,
	},
	{
		ID:        "revisionHistoryLimit",
		Header:    "Revision History Limit",
		Accessors: "spec.revisionHistoryLimit",
		Width:     120,
		Hidden:    true,
	},
	{
		ID:        "strategy",
		Header:    "Strategy",
		Accessors: "spec.strategy.type",
		Width:     120,
	},
	{
		ID:        "minReadySeconds",
		Header:    "Min Ready Seconds",
		Accessors: "spec.minReadySeconds",
		Width:     100,
		Hidden:    true,
	},
}

var (
	StatefulSetCols = []types.ColumnDefinition{
		{
			ID:        "podManagementPolicy",
			Header:    "Pod Management Policy",
			Accessors: "spec.podManagementPolicy",
			Width:     200,
		},
		{
			ID:        "availableReplicas",
			Header:    "Available",
			Accessors: "status.availableReplicas",
			Width:     80,
		},
		{
			ID:        "replicas",
			Header:    "Replicas",
			Accessors: "status.replicas",
			Width:     80,
		},
		{
			ID:        "readyReplicas",
			Header:    "Ready",
			Accessors: "status.readyReplicas",
			Width:     80,
		},
		{
			ID:        "updatedReplicas",
			Header:    "Updated",
			Accessors: "status.updatedReplicas",
			Width:     80,
			Hidden:    true,
		},
		{
			ID:        "revisionHistoryLimit",
			Header:    "Revision History Limit",
			Accessors: "spec.revisionHistoryLimit",
			Width:     120,
			Hidden:    true,
		},
		{
			ID:        "strategy",
			Header:    "Update Strategy",
			Accessors: "spec.updateStrategy.type",
			Width:     150,
		},
		{
			ID:        "minReadySeconds",
			Header:    "Min Ready Seconds",
			Accessors: "spec.minReadySeconds",
			Width:     100,
			Hidden:    true,
		},
		{
			ID:        "collisionCount",
			Header:    "Collision Count",
			Accessors: "status.collisionCount",
			Width:     120,
			Hidden:    true,
		},
	}
	DaemonSetCols = []types.ColumnDefinition{
		{
			ID:        "desiredNumberScheduled",
			Header:    "Desired",
			Accessors: "status.desiredNumberScheduled",
			Width:     100,
			Hidden:    true,
		},
		{
			ID:        "numberAvailable",
			Header:    "Available",
			Accessors: "status.numberAvailable",
			Width:     100,
		},
		{
			ID:        "numberReady",
			Header:    "Ready",
			Accessors: "status.numberReady",
			Width:     100,
			Hidden:    true,
		},
		{
			ID:        "currentNumberScheduled",
			Header:    "Current",
			Accessors: "status.currentNumberScheduled",
			Width:     100,
		},
		{
			ID:        "numberMisscheduled",
			Header:    "Misscheduled",
			Accessors: "status.numberMischeduled",
			Width:     100,
			Hidden:    true,
		},
		{
			ID:        "strategy",
			Header:    "Strategy",
			Accessors: "spec.updateStrategy.type",
			Width:     120,
		},
	}
	ReplicaSetCols = []types.ColumnDefinition{
		{
			ID:        "availableReplicas",
			Header:    "Available",
			Accessors: "status.availableReplicas",
			Width:     80,
		},
		{
			ID:        "replicas",
			Header:    "Replicas",
			Accessors: "status.replicas",
			Width:     80,
		},
		{
			ID:        "readyReplicas",
			Header:    "Ready",
			Accessors: "status.readyReplicas",
			Width:     80,
		},
		{
			ID:        "fullyLabeledReplicas",
			Header:    "Fully Labeled Replicas",
			Accessors: "status.fullyLabeledReplicas",
			Width:     200,
			Hidden:    true,
		},
		{
			ID:        "controlledBy",
			Header:    "Controlled By",
			Accessors: "$.metadata.ownerReferences[0]",
			Width:     150,
			ResourceLink: &types.ResourceLink{
				IDAccessor:     "name",
				TypeAccessor:   "kind",
				TypeMap:        map[string]string{"Deployment": "k8s:apps/deployments"},
				ScopeAccessors: []types.ScopeExtractor{{Dimension: "namespace", FieldPath: "$.metadata.namespace"}},
			},
		},
	}
	ControllerRevisionCols = []types.ColumnDefinition{
		{
			ID:        "revision",
			Header:    "Revision",
			Accessors: "revision",
			Width:     80,
		},
		{
			ID:        "ownerReferences",
			Header:    "Owner Reference",
			Accessors: "$.metadata.ownerReferences[0]",
			Width:     150,
			ResourceLink: &types.ResourceLink{
				IDAccessor:   "name",
				TypeAccessor: "kind",
				TypeMap: map[string]string{
					"ReplicaSet":            "k8s:apps/replicasets",
					"ReplicationController": "k8s:/replicationcontrollers",
					"StatefulSet":           "k8s:apps/statefulsets",
					"Deployment":            "k8s:apps/deployments",
					"DaemonSet":             "k8s:apps/daemonsets",
					"Job":                   "k8s:batch/jobs",
					"CronJob":               "k8s:batch/cronjobs",
				},
				ScopeAccessors: []types.ScopeExtractor{{Dimension: "namespace", FieldPath: "$.metadata.namespace"}},
			},
		},
	}
)
