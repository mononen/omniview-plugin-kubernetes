import type { DrawerComponentAction } from '@omniviewdev/runtime';

import { drawerActions as validatingAdmissionPolicyBindingActions } from './table/admissionregistrationv1/ValidatingAdmissionPolicyBinding/actions';
import { drawerActions as daemonSetActions } from './table/appsv1/DaemonSet/actions';
import { drawerActions as deploymentActions } from './table/appsv1/Deployment/actions';
import { drawerActions as replicaSetActions } from './table/appsv1/ReplicaSet/actions';
import { drawerActions as statefulSetActions } from './table/appsv1/StatefulSet/actions';
import { drawerActions as horizontalPodAutoscalerActions } from './table/autoscalingv1/HorizontalPodAutoscaler/actions';
import { drawerActions as cronJobActions } from './table/batchv1/CronJob/actions';
import { drawerActions as jobActions } from './table/batchv1/Job/actions';
import { drawerActions as endpointsActions } from './table/corev1/Endpoints/actions';
import { drawerActions as limitRangeActions } from './table/corev1/LimitRange/actions';
import { drawerActions as namespaceActions } from './table/corev1/Namespace/actions';
import { drawerActions as nodeActions } from './table/corev1/Node/actions';
import { drawerActions as persistentVolumeActions } from './table/corev1/PersistentVolume/actions';
import { drawerActions as persistentVolumeClaimActions } from './table/corev1/PersistentVolumeClaim/actions';
import { drawerActions as podActions } from './table/corev1/Pod/actions';
import { drawerActions as replicationControllerActions } from './table/corev1/ReplicationController/actions';
import { drawerActions as resourceQuotaActions } from './table/corev1/ResourceQuota/actions';
import { drawerActions as serviceActions } from './table/corev1/Service/actions';
import { drawerActions as serviceAccountActions } from './table/corev1/ServiceAccount/actions';
import { drawerActions as endpointSliceActions } from './table/discoveryv1/EndpointSlice/actions';
import { drawerActions as flowSchemaActions } from './table/flowcontrolv1/FlowSchema/actions';
import { drawerActions as ingressActions } from './table/networkingv1/Ingress/actions';
import { drawerActions as ingressClassActions } from './table/networkingv1/IngressClass/actions';
import { drawerActions as networkPolicyActions } from './table/networkingv1/NetworkPolicy/actions';
import { drawerActions as runtimeClassActions } from './table/nodev1/RuntimeClass/actions';
import { drawerActions as podDisruptionBudgetActions } from './table/policyv1/PodDisruptionBudget/actions';
import { drawerActions as clusterRoleActions } from './table/rbacv1/ClusterRole/actions';
import { drawerActions as clusterRoleBindingActions } from './table/rbacv1/ClusterRoleBinding/actions';
import { drawerActions as roleActions } from './table/rbacv1/Role/actions';
import { drawerActions as roleBindingActions } from './table/rbacv1/RoleBinding/actions';
import { drawerActions as cSIDriverActions } from './table/storagev1/CSIDriver/actions';
import { drawerActions as cSINodeActions } from './table/storagev1/CSINode/actions';
import { drawerActions as storageClassActions } from './table/storagev1/StorageClass/actions';
import { drawerActions as volumeAttachmentActions } from './table/storagev1/VolumeAttachment/actions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAction = DrawerComponentAction<any>;

export type ResourceDrawerActions = {
  actions: Array<AnyAction>;
};

/**
 * Drawer actions per resource key, shared by the resource tables and by the
 * drawer factories in `entry.ts` that open linked resources (owner chips,
 * Related and Graph views). Keeping one list means a resource offers the same
 * actions however its drawer was opened.
 */
export const resourceDrawerActions: Record<string, ResourceDrawerActions> = {
  'k8s:admissionregistration.k8s.io/validatingadmissionpolicybindings': { actions: validatingAdmissionPolicyBindingActions },
  'k8s:apps/daemonsets': { actions: daemonSetActions },
  'k8s:apps/deployments': { actions: deploymentActions },
  'k8s:apps/replicasets': { actions: replicaSetActions },
  'k8s:apps/statefulsets': { actions: statefulSetActions },
  'k8s:autoscaling/horizontalpodautoscalers': { actions: horizontalPodAutoscalerActions },
  'k8s:batch/cronjobs': { actions: cronJobActions },
  'k8s:batch/jobs': { actions: jobActions },
  'k8s:/endpoints': { actions: endpointsActions },
  'k8s:/limitranges': { actions: limitRangeActions },
  'k8s:/namespaces': { actions: namespaceActions },
  'k8s:/nodes': { actions: nodeActions },
  'k8s:/persistentvolumes': { actions: persistentVolumeActions },
  'k8s:/persistentvolumeclaims': { actions: persistentVolumeClaimActions },
  'k8s:/pods': { actions: podActions },
  'k8s:/replicationcontrollers': { actions: replicationControllerActions },
  'k8s:/resourcequotas': { actions: resourceQuotaActions },
  'k8s:/services': { actions: serviceActions },
  'k8s:/serviceaccounts': { actions: serviceAccountActions },
  'k8s:discovery.k8s.io/endpointslices': { actions: endpointSliceActions },
  'k8s:flowcontrol.apiserver.k8s.io/flowschemas': { actions: flowSchemaActions },
  'k8s:networking.k8s.io/ingresses': { actions: ingressActions },
  'k8s:networking.k8s.io/ingressclasses': { actions: ingressClassActions },
  'k8s:networking.k8s.io/networkpolicies': { actions: networkPolicyActions },
  'k8s:node.k8s.io/runtimeclasses': { actions: runtimeClassActions },
  'k8s:policy/poddisruptionbudgets': { actions: podDisruptionBudgetActions },
  'k8s:rbac.authorization.k8s.io/clusterroles': { actions: clusterRoleActions },
  'k8s:rbac.authorization.k8s.io/clusterrolebindings': { actions: clusterRoleBindingActions },
  'k8s:rbac.authorization.k8s.io/roles': { actions: roleActions },
  'k8s:rbac.authorization.k8s.io/rolebindings': { actions: roleBindingActions },
  'k8s:storage.k8s.io/csidrivers': { actions: cSIDriverActions },
  'k8s:storage.k8s.io/csinodes': { actions: cSINodeActions },
  'k8s:storage.k8s.io/storageclasses': { actions: storageClassActions },
  'k8s:storage.k8s.io/volumeattachments': { actions: volumeAttachmentActions },
};
