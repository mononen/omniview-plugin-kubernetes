/// <reference types="@welldone-software/why-did-you-render" />
import {
  PluginWindow,
  type DrawerContext,
  type DrawerComponent,
  type DrawerFactory,
  type ExtensionRegistration,
  type HomepageCardMeta,
  type SearchRouteHandleV1,
} from '@omniviewdev/runtime';
import { SiKubernetes } from 'react-icons/si';
import React from 'react';
import { RouteObject } from 'react-router-dom';

import ChartSidebar from './components/helm/charts/ChartSidebar';
import HelmChartTable from './components/helm/charts/Table';
import ReleaseSidebar from './components/helm/releases/ReleaseSidebar';
import HelmReleaseTable from './components/helm/releases/Table';
import RepoSidebar from './components/helm/repos/RepoSidebar';
import HelmRepoTable from './components/helm/repos/Table';
import { resourceDrawerActions } from './components/kubernetes/drawerActions';
import NodeSidebar from './components/kubernetes/sidebar/NodeSidebar';
import PodSidebar from './components/kubernetes/sidebar/Pod';
import SecretSidebar from './components/kubernetes/sidebar/SecretSidebar';
import MutatingWebhookConfigurationSidebar from './components/kubernetes/table/admissionregistrationv1/MutatingWebhookConfiguration/Sidebar';
import MutatingWebhookConfigurationTable from './components/kubernetes/table/admissionregistrationv1/MutatingWebhookConfiguration/Table';
import ValidatingAdmissionPolicySidebar from './components/kubernetes/table/admissionregistrationv1/ValidatingAdmissionPolicy/Sidebar';
import ValidatingAdmissionPolicyTable from './components/kubernetes/table/admissionregistrationv1/ValidatingAdmissionPolicy/Table';
import ValidatingAdmissionPolicyBindingSidebar from './components/kubernetes/table/admissionregistrationv1/ValidatingAdmissionPolicyBinding/Sidebar';
import ValidatingAdmissionPolicyBindingTable from './components/kubernetes/table/admissionregistrationv1/ValidatingAdmissionPolicyBinding/Table';
import ValidatingWebhookConfigurationSidebar from './components/kubernetes/table/admissionregistrationv1/ValidatingWebhookConfiguration/Sidebar';
import ValidatingWebhookConfigurationTable from './components/kubernetes/table/admissionregistrationv1/ValidatingWebhookConfiguration/Table';
import DaemonSetSidebar from './components/kubernetes/table/appsv1/DaemonSet/Sidebar';
import DaemonSetTable from './components/kubernetes/table/appsv1/DaemonSet/Table';
import DeploymentSidebar from './components/kubernetes/table/appsv1/Deployment/Sidebar';
import DeploymentTable from './components/kubernetes/table/appsv1/Deployment/Table';
import ReplicaSetSidebar from './components/kubernetes/table/appsv1/ReplicaSet/Sidebar';
import ReplicaSetTable from './components/kubernetes/table/appsv1/ReplicaSet/Table';
import StatefulSetSidebar from './components/kubernetes/table/appsv1/StatefulSet/Sidebar';
import StatefulSetTable from './components/kubernetes/table/appsv1/StatefulSet/Table';
import HorizontalPodAutoscalerSidebar from './components/kubernetes/table/autoscalingv1/HorizontalPodAutoscaler/Sidebar';
import HorizontalPodAutoscalerTable from './components/kubernetes/table/autoscalingv1/HorizontalPodAutoscaler/Table';
import CronJobSidebar from './components/kubernetes/table/batchv1/CronJob/Sidebar';
import CronJobTable from './components/kubernetes/table/batchv1/CronJob/Table';
import JobSidebar from './components/kubernetes/table/batchv1/Job/Sidebar';
import JobTable from './components/kubernetes/table/batchv1/Job/Table';
import LeaseSidebar from './components/kubernetes/table/coordinationv1/Lease/Sidebar';
import LeaseTable from './components/kubernetes/table/coordinationv1/Lease/Table';
import ComponentStatusSidebar from './components/kubernetes/table/corev1/ComponentStatus/Sidebar';
import ComponentStatusTable from './components/kubernetes/table/corev1/ComponentStatus/Table';
import ConfigMapSidebar from './components/kubernetes/table/corev1/ConfigMap/Sidebar';
import ConfigMapTable from './components/kubernetes/table/corev1/ConfigMap/Table';
import EndpointsSidebar from './components/kubernetes/table/corev1/Endpoints/Sidebar';
import EndpointsTable from './components/kubernetes/table/corev1/Endpoints/Table';
import EventSidebar from './components/kubernetes/table/corev1/Event/Sidebar';
import EventTable from './components/kubernetes/table/corev1/Event/Table';
import LimitRangeSidebar from './components/kubernetes/table/corev1/LimitRange/Sidebar';
import LimitRangeTable from './components/kubernetes/table/corev1/LimitRange/Table';
import NamespaceSidebar from './components/kubernetes/table/corev1/Namespace/Sidebar';
import NamespaceTable from './components/kubernetes/table/corev1/Namespace/Table';
import NodeTable from './components/kubernetes/table/corev1/Node/Table';
import PersistentVolumeSidebar from './components/kubernetes/table/corev1/PersistentVolume/Sidebar';
import PersistentVolumeTable from './components/kubernetes/table/corev1/PersistentVolume/Table';
import PersistentVolumeClaimSidebar from './components/kubernetes/table/corev1/PersistentVolumeClaim/Sidebar';
import PersistentVolumeClaimTable from './components/kubernetes/table/corev1/PersistentVolumeClaim/Table';
import PodTable from './components/kubernetes/table/corev1/Pod/Table';
import ReplicationControllerSidebar from './components/kubernetes/table/corev1/ReplicationController/Sidebar';
import ReplicationControllerTable from './components/kubernetes/table/corev1/ReplicationController/Table';
import ResourceQuotaSidebar from './components/kubernetes/table/corev1/ResourceQuota/Sidebar';
import ResourceQuotaTable from './components/kubernetes/table/corev1/ResourceQuota/Table';
import SecretTable from './components/kubernetes/table/corev1/Secret/Table';
import ServiceSidebar from './components/kubernetes/table/corev1/Service/Sidebar';
import ServiceTable from './components/kubernetes/table/corev1/Service/Table';
import ServiceAccountSidebar from './components/kubernetes/table/corev1/ServiceAccount/Sidebar';
import ServiceAccountTable from './components/kubernetes/table/corev1/ServiceAccount/Table';
import DefaultTable from './components/kubernetes/table/default/Table';
import EndpointSliceSidebar from './components/kubernetes/table/discoveryv1/EndpointSlice/Sidebar';
import EndpointSliceTable from './components/kubernetes/table/discoveryv1/EndpointSlice/Table';
import FlowSchemaSidebar from './components/kubernetes/table/flowcontrolv1/FlowSchema/Sidebar';
import FlowSchemaTable from './components/kubernetes/table/flowcontrolv1/FlowSchema/Table';
import PriorityLevelConfigurationSidebar from './components/kubernetes/table/flowcontrolv1/PriorityLevelConfiguration/Sidebar';
import PriorityLevelConfigurationTable from './components/kubernetes/table/flowcontrolv1/PriorityLevelConfiguration/Table';
import IngressSidebar from './components/kubernetes/table/networkingv1/Ingress/Sidebar';
import IngressTable from './components/kubernetes/table/networkingv1/Ingress/Table';
import IngressClassSidebar from './components/kubernetes/table/networkingv1/IngressClass/Sidebar';
import IngressClassTable from './components/kubernetes/table/networkingv1/IngressClass/Table';
import NetworkPolicySidebar from './components/kubernetes/table/networkingv1/NetworkPolicy/Sidebar';
import NetworkPolicyTable from './components/kubernetes/table/networkingv1/NetworkPolicy/Table';
import RuntimeClassSidebar from './components/kubernetes/table/nodev1/RuntimeClass/Sidebar';
import RuntimeClassTable from './components/kubernetes/table/nodev1/RuntimeClass/Table';
import PodDisruptionBudgetSidebar from './components/kubernetes/table/policyv1/PodDisruptionBudget/Sidebar';
import PodDisruptionBudgetTable from './components/kubernetes/table/policyv1/PodDisruptionBudget/Table';
import ClusterRoleSidebar from './components/kubernetes/table/rbacv1/ClusterRole/Sidebar';
import ClusterRoleTable from './components/kubernetes/table/rbacv1/ClusterRole/Table';
import ClusterRoleBindingSidebar from './components/kubernetes/table/rbacv1/ClusterRoleBinding/Sidebar';
import ClusterRoleBindingTable from './components/kubernetes/table/rbacv1/ClusterRoleBinding/Table';
import RoleSidebar from './components/kubernetes/table/rbacv1/Role/Sidebar';
import RoleTable from './components/kubernetes/table/rbacv1/Role/Table';
import RoleBindingSidebar from './components/kubernetes/table/rbacv1/RoleBinding/Sidebar';
import RoleBindingTable from './components/kubernetes/table/rbacv1/RoleBinding/Table';
import PriorityClassSidebar from './components/kubernetes/table/schedulingv1/PriorityClass/Sidebar';
import PriorityClassTable from './components/kubernetes/table/schedulingv1/PriorityClass/Table';
import CSIDriverSidebar from './components/kubernetes/table/storagev1/CSIDriver/Sidebar';
import CSIDriverTable from './components/kubernetes/table/storagev1/CSIDriver/Table';
import CSINodeSidebar from './components/kubernetes/table/storagev1/CSINode/Sidebar';
import CSINodeTable from './components/kubernetes/table/storagev1/CSINode/Table';
import CSIStorageCapacitySidebar from './components/kubernetes/table/storagev1/CSIStorageCapacity/Sidebar';
import CSIStorageCapacityTable from './components/kubernetes/table/storagev1/CSIStorageCapacity/Table';
import StorageClassSidebar from './components/kubernetes/table/storagev1/StorageClass/Sidebar';
import StorageClassTable from './components/kubernetes/table/storagev1/StorageClass/Table';
import VolumeAttachmentSidebar from './components/kubernetes/table/storagev1/VolumeAttachment/Sidebar';
import VolumeAttachmentTable from './components/kubernetes/table/storagev1/VolumeAttachment/Table';
import { createStandardViews } from './components/shared/sidebar/createDrawerViews';
import GenericResourceSidebar from './components/shared/sidebar/GenericResourceSidebar';
import KubernetesHomepageCard from './components/homepage/KubernetesHomepageCard';
import ClusterEditPage from './pages/ClusterEditPage';
import ClusterResourcesPage from './pages/ClusterResourcesPage';
import ClustersPage from './pages/ClustersPage';
import ClusterExtensionPage, { CLUSTER_PAGE_EXTENSION_POINT_ID } from './pages/extension';
import ClusterDashboardPage from './pages/dashboard';
import ClusterDashboardBenchmarksPage from './pages/dashboard/benchmarks';
import ClusterDashboardExtensionPage from './pages/dashboard/extension';
import ClusterDashboardMetricsPage from './pages/dashboard/metrics';
import ClusterDashboardOverviewPage from './pages/dashboard/overview';
import { kubernetesSearchProvider } from './search/provider';
import { kubernetesResourceIconSet } from './icons/resourceIcons';

const connectionSearchHandle: SearchRouteHandleV1 = {
  searchScope: ({ params }) => params.id
    ? { kind: 'connection', pluginId: 'kubernetes', connectionId: params.id, label: params.id }
    : undefined,
};

// @ts-expect-error Expose React to the plugin host window
window.PluginReact = React;

// ── Sidebar components ──────────────────────────────────────────────

// core.v1

// apps.v1

// batch.v1

// autoscaling.v1

// policy.v1

// flowcontrol.v1

// rbac.v1

// networking.v1

// discovery.v1

// node.v1

// storage.v1

// helm.v1

// admissionregistration.v1

/**
 * Sidebar components keyed by resource key (group::version::Kind).
 * Registered with the host's sidebar registry at plugin load time so that
 * linked-resource chip clicks render the same rich sidebar as table row clicks.
 */
export const sidebars: Record<string, React.FC<{ ctx: DrawerContext }>> = {
  // core.v1
  'k8s:/pods': PodSidebar,
  'k8s:/nodes': NodeSidebar,
  'k8s:/secrets': SecretSidebar,
  'k8s:/configmaps': ConfigMapSidebar,
  'k8s:/namespaces': NamespaceSidebar,
  'k8s:/services': ServiceSidebar,
  'k8s:/serviceaccounts': ServiceAccountSidebar,
  'k8s:/endpoints': EndpointsSidebar,
  'k8s:/replicationcontrollers': ReplicationControllerSidebar,
  'k8s:/persistentvolumes': PersistentVolumeSidebar,
  'k8s:/persistentvolumeclaims': PersistentVolumeClaimSidebar,
  'k8s:/limitranges': LimitRangeSidebar,
  'k8s:/resourcequotas': ResourceQuotaSidebar,
  'k8s:/componentstatuses': ComponentStatusSidebar,
  'k8s:/events': EventSidebar,
  // apps.v1
  'k8s:apps/replicasets': ReplicaSetSidebar,
  'k8s:apps/daemonsets': DaemonSetSidebar,
  'k8s:apps/deployments': DeploymentSidebar,
  'k8s:apps/statefulsets': StatefulSetSidebar,
  // batch.v1
  'k8s:batch/jobs': JobSidebar,
  'k8s:batch/cronjobs': CronJobSidebar,
  // autoscaling.v1
  'k8s:autoscaling/horizontalpodautoscalers': HorizontalPodAutoscalerSidebar,
  // policy.v1
  'k8s:policy/poddisruptionbudgets': PodDisruptionBudgetSidebar,
  // coordination.v1
  'k8s:coordination.k8s.io/leases': LeaseSidebar,
  // flowcontrol.v1
  'k8s:flowcontrol.apiserver.k8s.io/flowschemas': FlowSchemaSidebar,
  'k8s:flowcontrol.apiserver.k8s.io/prioritylevelconfigurations': PriorityLevelConfigurationSidebar,
  // rbac.v1
  'k8s:rbac.authorization.k8s.io/clusterroles': ClusterRoleSidebar,
  'k8s:rbac.authorization.k8s.io/clusterrolebindings': ClusterRoleBindingSidebar,
  'k8s:rbac.authorization.k8s.io/roles': RoleSidebar,
  'k8s:rbac.authorization.k8s.io/rolebindings': RoleBindingSidebar,
  // networking.v1
  'k8s:networking.k8s.io/networkpolicies': NetworkPolicySidebar,
  'k8s:networking.k8s.io/ingressclasses': IngressClassSidebar,
  'k8s:networking.k8s.io/ingresses': IngressSidebar,
  // discovery.v1
  'k8s:discovery.k8s.io/endpointslices': EndpointSliceSidebar,
  // scheduling.v1
  'k8s:scheduling.k8s.io/priorityclasses': PriorityClassSidebar,
  // node.v1
  'k8s:node.k8s.io/runtimeclasses': RuntimeClassSidebar,
  // storage.v1
  'k8s:storage.k8s.io/csidrivers': CSIDriverSidebar,
  'k8s:storage.k8s.io/csinodes': CSINodeSidebar,
  'k8s:storage.k8s.io/storageclasses': StorageClassSidebar,
  'k8s:storage.k8s.io/volumeattachments': VolumeAttachmentSidebar,
  'k8s:storage.k8s.io/csistoragecapacities': CSIStorageCapacitySidebar,
  // admissionregistration.v1
  'k8s:admissionregistration.k8s.io/mutatingwebhookconfigurations': MutatingWebhookConfigurationSidebar,
  'k8s:admissionregistration.k8s.io/validatingadmissionpolicies': ValidatingAdmissionPolicySidebar,
  'k8s:admissionregistration.k8s.io/validatingadmissionpolicybindings':
    ValidatingAdmissionPolicyBindingSidebar,
  'k8s:admissionregistration.k8s.io/validatingwebhookconfigurations':
    ValidatingWebhookConfigurationSidebar,
  // helm.v1
  'helm:releases': ReleaseSidebar,
  'helm:repositories': RepoSidebar,
  'helm:charts': ChartSidebar,
};

/**
 * Creates a DrawerFactory for a resource that has a sidebar component.
 * Produces a DrawerComponent with the standard view set (Overview, Metrics,
 * Events, Editor) and the resource's shared actions. Used by the host's drawer
 * registry so ref chip clicks render the same drawer as table row clicks.
 */
function createResourceDrawerFactory(
  resourceKey: string,
  SidebarComponent: React.FC<{ ctx: DrawerContext }>,
): DrawerFactory {
  const shared = resourceDrawerActions[resourceKey];
  return (_closeDrawer: () => void): DrawerComponent => ({
    title: resourceKey,
    views: createStandardViews({ SidebarComponent, onEditorSubmit: shared?.editorSubmit }),
    actions: shared?.actions ?? [],
  });
}

/**
 * Drawer factories keyed by resource key. Registered with the host's
 * drawer registry at plugin load time so that linked-resource chip clicks
 * and showResourceSidebar() render the full sidebar experience.
 */
export const drawers: Record<string, DrawerFactory> = Object.fromEntries(
  Object.entries(sidebars).map(([key, Component]) => [
    key,
    createResourceDrawerFactory(key, Component),
  ]),
);

/**
 * Default drawer factory for CRDs and dynamic resources that don't have
 * a dedicated sidebar. Uses GenericResourceSidebar which extracts key
 * fields from the resource definition's column defs.
 */
export const defaultDrawerFactory: DrawerFactory =
  createResourceDrawerFactory('__default__', GenericResourceSidebar);

const routes: Array<RouteObject> = [
  {
    path: '/',
    Component: ClustersPage,
  },
  {
    path: '/clusters',
    Component: ClustersPage,
  },
  {
    path: '/cluster/:id',
    children: [
      {
        path: 'edit',
        Component: ClusterEditPage,
        handle: connectionSearchHandle,
      },
      {
        path: 'resources',
        Component: ClusterResourcesPage,
        handle: connectionSearchHandle,
        children: [
          {
            path: '',
            Component: ClusterDashboardPage,
            children: [
              { path: '', index: true, Component: ClusterDashboardOverviewPage },
              { path: 'metrics', Component: ClusterDashboardMetricsPage },
              { path: 'benchmarks', Component: ClusterDashboardBenchmarksPage },
              { path: 'ext/:tabPath', Component: ClusterDashboardExtensionPage },
            ],
          },
          // Pages contributed by other plugins
          { path: 'page/:pagePath', Component: ClusterExtensionPage },
          { path: 'page/:pagePath/:subPath', Component: ClusterExtensionPage },
          // admissionregistration.v1
          {
            path: encodeURIComponent('k8s:admissionregistration.k8s.io/mutatingwebhookconfigurations'),
            Component: MutatingWebhookConfigurationTable,
          },
          {
            path: encodeURIComponent('k8s:admissionregistration.k8s.io/validatingadmissionpolicies'),
            Component: ValidatingAdmissionPolicyTable,
          },
          {
            path: encodeURIComponent('k8s:admissionregistration.k8s.io/validatingadmissionpolicybindings'),
            Component: ValidatingAdmissionPolicyBindingTable,
          },
          {
            path: encodeURIComponent('k8s:admissionregistration.k8s.io/validatingwebhookconfigurations'),
            Component: ValidatingWebhookConfigurationTable,
          },

          // apps.v1
          { path: encodeURIComponent('k8s:apps/daemonsets'), Component: DaemonSetTable },
          { path: encodeURIComponent('k8s:apps/deployments'), Component: DeploymentTable },
          { path: encodeURIComponent('k8s:apps/replicasets'), Component: ReplicaSetTable },
          { path: encodeURIComponent('k8s:apps/statefulsets'), Component: StatefulSetTable },

          // autoscaling.v1
          {
            path: encodeURIComponent('k8s:autoscaling/horizontalpodautoscalers'),
            Component: HorizontalPodAutoscalerTable,
          },


          // batch.v1
          { path: encodeURIComponent('k8s:batch/cronjobs'), Component: CronJobTable },
          { path: encodeURIComponent('k8s:batch/jobs'), Component: JobTable },

          // core.v1
          { path: encodeURIComponent('k8s:/componentstatuses'), Component: ComponentStatusTable },
          { path: encodeURIComponent('k8s:/configmaps'), Component: ConfigMapTable },
          { path: encodeURIComponent('k8s:/endpoints'), Component: EndpointsTable },
          { path: encodeURIComponent('k8s:/events'), Component: EventTable },
          { path: encodeURIComponent('k8s:/limitranges'), Component: LimitRangeTable },
          { path: encodeURIComponent('k8s:/namespaces'), Component: NamespaceTable },
          { path: encodeURIComponent('k8s:/nodes'), Component: NodeTable },
          { path: encodeURIComponent('k8s:/persistentvolumes'), Component: PersistentVolumeTable },
          { path: encodeURIComponent('k8s:/persistentvolumeclaims'), Component: PersistentVolumeClaimTable },
          { path: encodeURIComponent('k8s:/pods'), Component: PodTable },
          { path: encodeURIComponent('k8s:/resourcequotas'), Component: ResourceQuotaTable },
          { path: encodeURIComponent('k8s:/secrets'), Component: SecretTable },
          { path: encodeURIComponent('k8s:/services'), Component: ServiceTable },
          { path: encodeURIComponent('k8s:/serviceaccounts'), Component: ServiceAccountTable },
          { path: encodeURIComponent('k8s:/replicationcontrollers'), Component: ReplicationControllerTable },

          // coordination.v1
          { path: encodeURIComponent('k8s:coordination.k8s.io/leases'), Component: LeaseTable },

          // discovery.v1
          { path: encodeURIComponent('k8s:discovery.k8s.io/endpointslices'), Component: EndpointSliceTable },

          // flowcontrol.v1
          {
            path: encodeURIComponent('k8s:flowcontrol.apiserver.k8s.io/prioritylevelconfigurations'),
            Component: PriorityLevelConfigurationTable,
          },
          { path: encodeURIComponent('k8s:flowcontrol.apiserver.k8s.io/flowschemas'), Component: FlowSchemaTable },

          // networking.v1
          { path: encodeURIComponent('k8s:networking.k8s.io/ingresses'), Component: IngressTable },
          { path: encodeURIComponent('k8s:networking.k8s.io/ingressclasses'), Component: IngressClassTable },
          { path: encodeURIComponent('k8s:networking.k8s.io/networkpolicies'), Component: NetworkPolicyTable },

          // node.v1
          { path: encodeURIComponent('k8s:node.k8s.io/runtimeclasses'), Component: RuntimeClassTable },

          // policy.v1
          { path: encodeURIComponent('k8s:policy/poddisruptionbudgets'), Component: PodDisruptionBudgetTable },

          // rbac.v1
          { path: encodeURIComponent('k8s:rbac.authorization.k8s.io/clusterroles'), Component: ClusterRoleTable },
          { path: encodeURIComponent('k8s:rbac.authorization.k8s.io/clusterrolebindings'), Component: ClusterRoleBindingTable },
          { path: encodeURIComponent('k8s:rbac.authorization.k8s.io/roles'), Component: RoleTable },
          { path: encodeURIComponent('k8s:rbac.authorization.k8s.io/rolebindings'), Component: RoleBindingTable },

          // scheduling.v1
          { path: encodeURIComponent('k8s:scheduling.k8s.io/priorityclasses'), Component: PriorityClassTable },

          // storage.v1
          { path: encodeURIComponent('k8s:storage.k8s.io/csidrivers'), Component: CSIDriverTable },
          { path: encodeURIComponent('k8s:storage.k8s.io/csinodes'), Component: CSINodeTable },
          { path: encodeURIComponent('k8s:storage.k8s.io/csistoragecapacities'), Component: CSIStorageCapacityTable },
          { path: encodeURIComponent('k8s:storage.k8s.io/storageclasses'), Component: StorageClassTable },
          { path: encodeURIComponent('k8s:storage.k8s.io/volumeattachments'), Component: VolumeAttachmentTable },

          // helm.v1
          { path: encodeURIComponent('helm:releases'), Component: HelmReleaseTable },
          { path: encodeURIComponent('helm:repositories'), Component: HelmRepoTable },
          { path: encodeURIComponent('helm:charts'), Component: HelmChartTable },

          // Custom Resource Definitions / breaking api versions
          { path: ':resourceKey', Component: DefaultTable },
        ],
      },
    ],
  },
];

export const extensionRegistrations: ExtensionRegistration[] = [
  {
    extensionPointId: 'omniview/resource/icons',
    registration: {
      id: 'resource-icons',
      plugin: 'kubernetes',
      label: 'Kubernetes resource icons',
      value: kubernetesResourceIconSet,
    },
  },
  {
    extensionPointId: 'omniview/global-search',
    registration: {
      id: 'kubernetes/global-search',
      plugin: 'kubernetes',
      label: 'Kubernetes',
      value: kubernetesSearchProvider,
    },
  },
  {
    extensionPointId: 'omniview/home/card',
    registration: {
      id: 'kubernetes/home/card',
      plugin: 'kubernetes',
      label: 'Kubernetes',
      value: KubernetesHomepageCard,
      meta: {
        label: 'Kubernetes',
        description: 'Recent clusters, favorites, and folders',
        defaultConfig: { sections: ['connected', 'recent', 'favorites', 'folders'], maxItems: 5 },
        defaultWidth: 'medium',
        icon: SiKubernetes,
      } satisfies HomepageCardMeta,
    },
  },
];

export const plugin = new PluginWindow()
  .registerExtensionPoints([{ id: CLUSTER_PAGE_EXTENSION_POINT_ID, mode: 'multiple' }])
  .setRootPage(ClustersPage)
  .withRoutes(routes);
