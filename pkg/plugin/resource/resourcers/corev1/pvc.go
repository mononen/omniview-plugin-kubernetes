//nolint:gochecknoglobals,gomnd // column definitions are global
package corev1

import types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

var PVCDef = types.ResourceDefinition{
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
			Alignment: "LEFT",
			Width:     180,
		},
		{
			ID:        "storageClassName",
			Header:    "StorageClass",
			Accessors: "spec.storageClassName",
			Alignment: "LEFT",
			Width:     120,
		},
		{
			ID:        "status",
			Header:    "Status",
			Accessors: "status.phase",
			Alignment: "LEFT",
			Width:     100,
			ColorMap: map[string]string{
				"Bound":   "success",
				"Pending": "warning",
				"Lost":    "danger",
			},
		},
		{
			ID:        "capacity",
			Header:    "Capacity",
			Accessors: "status.capacity.storage",
			Alignment: "LEFT",
			Width:     100,
		},
		{
			ID:        "accessModes",
			Header:    "Access Modes",
			Accessors: "$.spec.accessModes[*]",
			Alignment: "LEFT",
			Width:     150,
		},
		{
			ID:        "volumeMode",
			Header:    "Volume Mode",
			Accessors: "spec.volumeMode",
			Alignment: "LEFT",
			Width:     120,
		},
		{
			ID:        "volumeName",
			Header:    "Volume Name",
			Accessors: "spec.volumeName",
			Alignment: "LEFT",
			Width:     300,
			Hidden:    true,
		},
		{
			ID:        "storageRequest",
			Header:    "Storage Request",
			Accessors: "spec.resources.requests.storage",
			Alignment: "LEFT",
			Width:     150,
			Hidden:    true,
		},
		{
			ID:        "age",
			Header:    "Age",
			Accessors: "metadata.creationTimestamp",
			Alignment: "LEFT",
			Width:     80,
			Formatter: "AGE",
		},
	},
}
