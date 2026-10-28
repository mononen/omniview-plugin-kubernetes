//nolint:gochecknoglobals,gomnd // column definitions are global
package corev1

import types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

var ComponentStatusDef = types.ResourceDefinition{
	ColumnDefs: []types.ColumnDefinition{
		{
			ID:        "name",
			Header:    "Name",
			Accessors: "metadata.name",
			Alignment: "LEFT",
		},
		{
			ID:        "healthy",
			Header:    "Healthy",
			Accessors: "$.conditions[?(@.type=='Healthy')].status",
			Width:     100,
			ColorMap: map[string]string{
				"True":  "success",
				"False": "danger",
			},
		},
	},
}
