//nolint:gochecknoglobals,gomnd // column definitions are global
package corev1

import types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"

var ServiceDef = types.ResourceDefinition{
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
			ID:        "type",
			Header:    "Type",
			Accessors: "spec.type",
			Alignment: "LEFT",
			Width:     100,
		},
		{
			ID:        "clusterIP",
			Header:    "Cluster IP",
			Accessors: "spec.clusterIP",
			Alignment: "LEFT",
			Width:     150,
		},
		{
			ID:        "externalIP",
			Header:    "External IP",
			Accessors: "spec.externalIPs",
			Alignment: "LEFT",
			Width:     150,
		},
		{
			ID:        "internalTrafficPolicy",
			Header:    "Internal Traffic Policy",
			Accessors: "spec.internalTrafficPolicy",
			Alignment: "LEFT",
			Width:     200,
			Hidden:    true,
		},
		{
			ID:        "ipFamily",
			Header:    "IP Families",
			Accessors: "$.spec.ipFamilies[*]",
			Width:     100,
			Hidden:    true,
		},
		{
			ID:        "ipFamilyPolicy",
			Header:    "IP Family Policy",
			Accessors: "spec.ipFamilyPolicy",
			Alignment: "LEFT",
			Width:     130,
			Hidden:    true,
		},
		{
			ID:        "sessionAffinity",
			Header:    "Session Affinity",
			Accessors: "spec.sessionAffinity",
			Alignment: "LEFT",
			Width:     100,
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
