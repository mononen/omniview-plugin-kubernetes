//nolint:gochecknoglobals,gomnd // column definitions are global
package corev1

import types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

var NamespaceDef = types.ResourceDefinition{
	ColumnDefs: []types.ColumnDefinition{
		{
			ID:        "name",
			Header:    "Name",
			Accessors: "metadata.name",
			Alignment: "LEFT",
		},
		{
			ID:        "phase",
			Header:    "Phase",
			Accessors: "status.phase",
			Width:     100,
			ColorMap: map[string]string{
				"Active":      "success",
				"Terminating": "danger",
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
