//nolint:gochecknoglobals,gomnd // column definitions are global
package corev1

import types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

var NodeDef = types.ResourceDefinition{
	ColumnDefs: []types.ColumnDefinition{
		{
			ID:        "name",
			Header:    "Name",
			Accessors: "metadata.name",
			Alignment: "LEFT",
		},
		{
			ID:        "architecture",
			Header:    "Architecture",
			Accessors: "status.nodeInfo.architecture",
			Alignment: "LEFT",
			Width:     120,
		},
		{
			ID:        "os",
			Header:    "OS",
			Accessors: "status.nodeInfo.operatingSystem",
			Alignment: "LEFT",
			Hidden:    true,
			Width:     80,
		},
		{
			ID:        "kernelVersion",
			Header:    "Kernel Version",
			Accessors: "status.nodeInfo.kernelVersion",
			Alignment: "LEFT",
			Hidden:    true,
		},
		{
			ID:        "osImage",
			Header:    "OS Image",
			Accessors: "status.nodeInfo.osImage",
			Alignment: "LEFT",
		},
		{
			ID:        "containerRuntime",
			Header:    "Container Runtime",
			Accessors: "status.nodeInfo.containerRuntimeVersion",
			Alignment: "LEFT",
			Hidden:    true,
		},
		{
			ID:        "kubeletVersion",
			Header:    "Kubelet Version",
			Accessors: "status.nodeInfo.kubeletVersion",
			Alignment: "LEFT",
		},
		{
			ID:        "cpuCapacity",
			Header:    "CPU",
			Accessors: "status.capacity.cpu",
			Alignment: "LEFT",
			Hidden:    true,
			Width:     80,
		},
		{
			ID:        "memoryCapacity",
			Header:    "Memory",
			Accessors: "status.capacity.memory",
			Alignment: "LEFT",
			Formatter: "BYTES",
			Hidden:    true,
			Width:     120,
		},
		{
			ID:        "podsCapacity",
			Header:    "Pods",
			Accessors: "status.capacity.pods",
			Alignment: "LEFT",
			Hidden:    true,
			Width:     80,
		},
		{
			ID:        "ephemeralStorageCapacity",
			Header:    "Ephemeral Storage",
			Accessors: "status.capacity.ephemeral-storage",
			Alignment: "LEFT",
			Formatter: "BYTES",
			Hidden:    true,
			Width:     120,
		},
		{
			ID:        "age",
			Header:    "Age",
			Accessors: "metadata.creationTimestamp",
			Alignment: "LEFT",
			Width:     120,
			Formatter: "AGE",
		},
	},
}
