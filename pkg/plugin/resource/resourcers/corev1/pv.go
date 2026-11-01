//nolint:gochecknoglobals,gomnd // column definitions are global
package corev1

import types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

var PVDef = types.ResourceDefinition{
	ColumnDefs: []types.ColumnDefinition{
		{
			ID:        "name",
			Header:    "Name",
			Accessors: "metadata.name",
		},
		{
			ID:        "claimRef",
			Header:    "ClaimRef",
			Accessors: "$.spec.claimRef",
			Width:     280,
			ResourceLink: &types.ResourceLink{
				IDAccessor:     "name",
				Type:           "k8s:/persistentvolumeclaims",
				ScopeAccessors: []types.ScopeExtractor{{Dimension: "namespace", FieldPath: "namespace"}},
				DisplayID:      true,
			},
		},
		{
			ID:        "reclaimPolicy",
			Header:    "Reclaim Policy",
			Accessors: "spec.persistentVolumeReclaimPolicy",
			Width:     130,
		},
		{
			ID:        "csiDriver",
			Header:    "CSI Driver",
			Accessors: "spec.csi.driver",
			Width:     150,
			Hidden:    true,
		},
		{
			ID:        "fsType",
			Header:    "FS Type",
			Accessors: "spec.csi.fsType",
			Width:     100,
			Hidden:    true,
		},
		{
			ID:        "volumeHandle",
			Header:    "Volume Handle",
			Accessors: "spec.csi.volumeHandle",
			Width:     180,
			Hidden:    true,
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
			Accessors: "spec.capacity.storage",
			Alignment: "LEFT",
			Width:     100,
		},
		{
			ID:        "accessModes",
			Header:    "Access Modes",
			Accessors: "$.spec.accessModes[*]",
			Alignment: "LEFT",
			Width:     150,
			Hidden:    true,
		},
		{
			ID:        "volumeMode",
			Header:    "Volume Mode",
			Accessors: "spec.volumeMode",
			Alignment: "LEFT",
			Width:     120,
			Hidden:    true,
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
