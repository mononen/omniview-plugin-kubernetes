//nolint:gochecknoglobals,gomnd // column definitions are global
package resourcers

import (
	"github.com/omniview/kubernetes/pkg/plugin/resource/resourcers/appsv1"
	"github.com/omniview/kubernetes/pkg/plugin/resource/resourcers/autoscalingv2"
	"github.com/omniview/kubernetes/pkg/plugin/resource/resourcers/corev1"

	types "github.com/omniviewdev/plugin-sdk/pkg/resource/v2"
)

func GenerateResourceDef(columndefs []types.ColumnDefinition, namespaced bool) types.ResourceDefinition {
	cols := make([]types.ColumnDefinition, 0, len(columndefs)+3)
	cols = append(cols,
		types.ColumnDefinition{
			ID:        "name",
			Header:    "Name",
			Accessors: "metadata.name",
			Alignment: "LEFT",
		},
	)

	if namespaced {
		cols = append(cols,
			types.ColumnDefinition{
				ID:        "namespace",
				Header:    "Namespace",
				Accessors: "metadata.namespace",
				Alignment: "LEFT",
				Width:     150,
			},
		)
	}

	cols = append(cols, columndefs...)
	cols = append(
		cols,
		types.ColumnDefinition{
			ID:        "age",
			Header:    "Age",
			Accessors: "metadata.creationTimestamp",
			Alignment: "LEFT",
			Width:     120,
			Formatter: "AGE",
		},
	)

	def := types.ResourceDefinition{
		ColumnDefs:       cols,
	}


	return def
}

var DefaultResourceDef = types.ResourceDefinition{
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
			Width:     150,
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

var ResourceDefs = map[string]types.ResourceDefinition{
	"k8s:apps/deployments": GenerateResourceDef(
		appsv1.DeploymentCols,
		true,
	),
	"k8s:apps/statefulsets": GenerateResourceDef(
		appsv1.StatefulSetCols,
		true,
	),
	"k8s:apps/replicasets": GenerateResourceDef(
		appsv1.ReplicaSetCols,
		true,
	),
	"k8s:apps/daemonsets": GenerateResourceDef(
		appsv1.DaemonSetCols,
		true,
	),
	"k8s:apps/controllerrevisions": GenerateResourceDef(
		appsv1.ControllerRevisionCols,
		true,
	),
	"k8s:/nodes":                  corev1.NodeDef,
	"k8s:/pods":                   corev1.PodDef,
	"k8s:/services":               corev1.ServiceDef,
	"k8s:/persistentvolumeclaims": corev1.PVCDef,
	"k8s:/persistentvolumes":      corev1.PVDef,
	"k8s:/namespaces":             corev1.NamespaceDef,
	"k8s:/componentstatuses":       corev1.ComponentStatusDef,
	"k8s:autoscaling/horizontalpodautoscalers": GenerateResourceDef(
		autoscalingv2.HPACols,
		true,
	),
}
