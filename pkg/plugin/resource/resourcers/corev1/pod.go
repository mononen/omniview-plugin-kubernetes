//nolint:gochecknoglobals,gomnd // column definitions are global
package corev1

import types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

var PodDef = types.ResourceDefinition{
	ColumnDefs: []types.ColumnDefinition{
		{
			ID:        "name",
			Header:    "Name",
			Accessors: "metadata.name",
			Alignment: "LEFT",
		},
		{
			ID:        "namespace",
			Header:    "Namespace",
			Accessors: "metadata.namespace",
			Width:     180,
		},
		// {
		// 	ID:        "containers",
		// 	Header:    "Containers",
		// 	Accessors: "$.status.containerStatuses",
		// 	Width:     150,
		// 	Component: "ContainerStatusCell",
		// },
		{
			ID:        "restarts",
			Header:    "Restarts",
			Accessors: "$.status.containerStatuses[*].restartCount",
			Formatter: "SUM",
			ColorMap: map[string]string{
				"0": "neutral",
				"1": "warning",
				"*": "danger",
			},
			Width: 80,
		},
		{
			ID:        "controlledBy",
			Header:    "Controlled By",
			Accessors: "$.metadata.ownerReferences[0]",
			Width:     150,
			ResourceLink: &types.ResourceLink{
				IDAccessor:   "name",
				TypeAccessor: "kind",
				TypeMap: map[string]string{
					"ReplicaSet":            "k8s:apps/replicasets",
					"ReplicationController": "k8s:/replicationcontrollers",
					"StatefulSet":           "k8s:apps/statefulsets",
					"DaemonSet":             "k8s:apps/daemonsets",
					"Job":                   "k8s:batch/jobs",
					"CronJob":               "k8s:batch/cronjobs",
				},
				ScopeAccessors: []types.ScopeExtractor{{Dimension: "namespace", FieldPath: "$.metadata.namespace"}},
			},
		},
		{
			ID:        "node",
			Header:    "Node",
			Accessors: "spec.nodeName",
			Width:     200,
			ResourceLink: &types.ResourceLink{
				IDAccessor:     ".",
				ScopeAccessors: []types.ScopeExtractor{},
				Type:           "k8s:/nodes",
			},
		},
		{
			ID:        "hostIP",
			Header:    "Host IP",
			Accessors: "status.hostIP",
			Hidden:    true,
			Width:     120,
		},
		{
			ID:        "podIP",
			Header:    "Pod IP",
			Accessors: "status.podIP",
			Hidden:    true,
			Width:     120,
		},
		{
			ID:        "qos",
			Header:    "QoS",
			Accessors: "status.qosClass",
			Width:     100,
			Hidden:    true,
		},
		{
			ID:        "dnsPolicy",
			Header:    "DNS Policy",
			Accessors: "spec.dnsPolicy",
			Width:     100,
			Hidden:    true,
		},
		{
			ID:        "serviceAccount",
			Header:    "Service Account",
			Accessors: "spec.serviceAccountName",
			Hidden:    true,
		},
		{
			ID:        "preemptionPolicy",
			Header:    "Preemption Policy",
			Accessors: "spec.preemptionPolicy",
			Hidden:    true,
			Width:     200,
		},
		{
			ID:        "priority",
			Header:    "Priority",
			Accessors: "spec.priority",
			Hidden:    true,
			Width:     120,
		},
		{
			ID:        "schedulerName",
			Header:    "Scheduler",
			Accessors: "spec.schedulerName",
			Hidden:    true,
		},
		{
			ID:        "hostname",
			Header:    "Hostname",
			Accessors: "spec.hostname",
			Hidden:    true,
		},
		{
			ID:               "phase",
			Header:           "Phase",
			Accessors:        "metadata.deletionTimestamp,status.phase",
			AccessorPriority: "FIRST",
			Width:            100,
			ValueMap: map[string]string{
				"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z": "Terminating",
			},
			ColorMap: map[string]string{
				"Pending":     "warning",
				"Running":     "success",
				"Succeeded":   "success",
				"Failed":      "danger",
				"Unknown":     "warning",
				"Terminating": "neutral",
			},
		},
		{
			ID:        "age",
			Header:    "Age",
			Accessors: "metadata.creationTimestamp",
			Alignment: "LEFT",
			Width:     100,
			Formatter: "AGE",
		},
	},
}
