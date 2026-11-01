 
import { Spinner } from '@omniviewdev/base-ui';
import {
  usePluginContext,
  useResourceGroups,
  useResourceTypes,
  useWatchState,
  WatchState,
  ResourceIcon,
} from '@omniviewdev/runtime';
import type { ResourceGroup } from '@omniviewdev/runtime';
import React from 'react';
import {
  LuBlocks,
  LuBoxes,
  LuClipboard,
  LuDatabase,
  LuGauge,
  LuLock,
  LuNetwork,
  LuTicket,
} from 'react-icons/lu';
import { SiHelm } from 'react-icons/si';

import { PLUGIN_ID } from '@/pluginId';

import DynamicIcon from '../components/shared/Icon';
import type { NavSection, NavMenuItem } from '../types/navigation';
import type { ResourceType } from '@omniviewdev/runtime';
import { IsImage } from '../utils/url';

import { useStableObject } from './useStableRef';

type Opts = {
  connectionID: string;
};

/**
 * Get the ID from the meta object
 */
const toID = (type: string) => encodeURIComponent(type);

const primaryTypes: Record<string, true> = { 'k8s:/nodes': true, 'k8s:events.k8s.io/events': true, 'k8s:/namespaces': true };

/** sorter for sorting alphabetically by labels */
const labelSort = (a: NavMenuItem, b: NavMenuItem) => a.label.localeCompare(b.label);

/**
 * Resolve an icon value (string name, image URL, or ReactNode) to a ReactNode.
 */
function resolveIcon(
  icon: string | React.ReactNode | undefined,
  size = 16,
): React.ReactNode | undefined {
  if (!icon) return undefined;
  if (typeof icon !== 'string') return icon;
  if (icon === '') return undefined;
  if (IsImage(icon))
    return <img src={icon} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />;
  return <DynamicIcon name={icon} size={size} />;
}

// --- Module-level icon constants (allocated once, reused forever) ---

const ICON_GAUGE = <LuGauge />;
const ICON_BOXES = <LuBoxes />;
const ICON_CLIPBOARD = <LuClipboard />;
const ICON_NETWORK = <LuNetwork />;
const ICON_DATABASE = <LuDatabase />;
const ICON_LOCK = <LuLock />;
const ICON_TICKET = <LuTicket />;
const ICON_HELM = <SiHelm />;
const ICON_BLOCKS = <LuBlocks />;

// --- Module-level badge JSX constants ---

const syncingBadgeStyle: React.CSSProperties = { width: 10, height: 10 };

const errorBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: 'var(--ov-color-danger)',
  flexShrink: 0,
};

const SYNCING_BADGE = <Spinner size="xs" color="brand" style={syncingBadgeStyle} />;
const ERROR_BADGE = <span style={errorBadgeStyle} />;

/** Get a badge for a nav item based on its watch state */
const getStateBadge = (
  navId: string,
  states?: Record<string, WatchState>,
): React.ReactNode | undefined => {
  if (!states) return undefined;
  const state = states[decodeURIComponent(navId)];
  if (state === WatchState.WatchStateSyncing || state === WatchState.WatchStateIdle)
    return SYNCING_BADGE;
  if (state === WatchState.WatchStateError || state === WatchState.WatchStateFailed || state === WatchState.WatchStateForbidden) return ERROR_BADGE;
  return undefined;
};

/** Get a group-level badge by aggregating children states */
const getGroupBadge = (
  children: NavMenuItem[],
  states?: Record<string, WatchState>,
): React.ReactNode | undefined => {
  if (!states || !children?.length) return undefined;
  let hasSyncing = false;
  let hasError = false;
  for (const child of children) {
    const state = states[decodeURIComponent(child.id)];
    if (state === WatchState.WatchStateSyncing || state === WatchState.WatchStateIdle)
      hasSyncing = true;
    if (state === WatchState.WatchStateError || state === WatchState.WatchStateFailed || state === WatchState.WatchStateForbidden) hasError = true;
  }
  if (hasError) return ERROR_BADGE;
  if (hasSyncing) return SYNCING_BADGE;
  return undefined;
};

/**
 * Calculates the full sidebar layout divided by the API groups
 */
const calculateFullLayout = (
  data: readonly ResourceGroup[],
  types: readonly ResourceType[],
  watchStates?: Record<string, WatchState>,
): Array<NavSection> => {
  if (!data) {
    return [];
  }

  const coreSection: NavMenuItem[] = [];
  const crdSection: NavMenuItem[] = [];

  const grouped: NavMenuItem[] = Object.values(data)
    .filter((group): group is ResourceGroup => group !== undefined)
    .map((group) => {
      const children: NavMenuItem[] = [];

      group.resources.forEach((type) => {
        children.push({
          id: toID(type),
          label: types.find((entry) => entry.type === type)?.displayName ?? type,
          icon: <ResourceIcon pluginId={PLUGIN_ID} resourceKey={type} size={16} />,
          badge: getStateBadge(toID(type), watchStates),
        });
      });

      children.sort((a, b) => a.label.localeCompare(b.label));

      const item: NavMenuItem = {
        id: group.id,
        label: group.name,
        icon: resolveIcon(group.icon),
        children,
        badge: getGroupBadge(children, watchStates),
      };

      return item;
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  grouped.forEach((group) => {
    if (!group.children?.some((child) => ModernSectionMap[decodeURIComponent(child.id)] || primaryTypes[decodeURIComponent(child.id)])) {
      crdSection.push(group);
    } else {
      coreSection.push(group);
    }
  });

  const sections: NavSection[] = [
    {
      title: '',
      items: [{ id: '__dashboard__', label: 'Dashboard', icon: ICON_GAUGE }, ...coreSection],
    },
    { title: 'Other API Groups', items: crdSection },
  ];

  return sections;
};

type ModernSection =
  | 'workload'
  | 'config'
  | 'network'
  | 'storage'
  | 'access_control'
  | 'admission_control'
  | 'helm';

/**
 * Map of where found resources should go
 */
const ModernSectionMap: Record<string, ModernSection> = {
  'k8s:/pods': 'workload',
  'k8s:/replicationcontrollers': 'workload',
  'k8s:apps/deployments': 'workload',
  'k8s:apps/daemonsets': 'workload',
  'k8s:apps/replicasets': 'workload',
  'k8s:apps/statefulsets': 'workload',
  'k8s:batch/cronjobs': 'workload',
  'k8s:batch/jobs': 'workload',
  'k8s:/configmaps': 'config',
  'k8s:/secrets': 'config',
  'k8s:/resourcequotas': 'config',
  'k8s:/limitranges': 'config',
  'k8s:autoscaling/horizontalpodautoscalers': 'config',
  'k8s:policy/poddisruptionbudgets': 'config',
  'k8s:scheduling.k8s.io/priorityclasses': 'config',
  'k8s:node.k8s.io/runtimeclasses': 'config',
  'k8s:coordination.k8s.io/leases': 'config',
  'k8s:flowcontrol.apiserver.k8s.io/flowschemas': 'config',
  'k8s:flowcontrol.apiserver.k8s.io/prioritylevelconfigurations': 'config',
  'k8s:networking.k8s.io/ingresses': 'network',
  'k8s:networking.k8s.io/ingressclasses': 'network',
  'k8s:/endpoints': 'network',
  'k8s:discovery.k8s.io/endpointslices': 'network',
  'k8s:/services': 'network',
  'k8s:networking.k8s.io/networkpolicies': 'network',
  'k8s:/persistentvolumes': 'storage',
  'k8s:/persistentvolumeclaims': 'storage',
  'k8s:storage.k8s.io/storageclasses': 'storage',
  'k8s:storage.k8s.io/csidrivers': 'storage',
  'k8s:storage.k8s.io/csinodes': 'storage',
  'k8s:storage.k8s.io/volumeattachments': 'storage',
  'k8s:/serviceaccounts': 'access_control',
  'k8s:rbac.authorization.k8s.io/roles': 'access_control',
  'k8s:rbac.authorization.k8s.io/clusterroles': 'access_control',
  'k8s:rbac.authorization.k8s.io/rolebindings': 'access_control',
  'k8s:rbac.authorization.k8s.io/clusterrolebindings': 'access_control',
  'k8s:admissionregistration.k8s.io/mutatingwebhookconfigurations': 'admission_control',
  'k8s:admissionregistration.k8s.io/validatingwebhookconfigurations': 'admission_control',
  'k8s:admissionregistration.k8s.io/validatingadmissionpolicies': 'admission_control',
  'k8s:admissionregistration.k8s.io/validatingadmissionpolicybindings': 'admission_control',
  'helm:releases': 'helm',
  'helm:repositories': 'helm',
  'helm:charts': 'helm',
};

/**
 * Calculates a modern sidebar layout inspired by Kubernetes Dashboard for familiarity. Only adds
 * resources that are available.
 */
const calculateModernLayout = (
  data: readonly ResourceGroup[],
  types: readonly ResourceType[],
  watchStates?: Record<string, WatchState>,
): Array<NavSection> => {
  if (!data) {
    return [];
  }

  const withBadge = (id: string, label: string): NavMenuItem => ({
    id,
    label,
    icon: <ResourceIcon pluginId={PLUGIN_ID} resourceKey={decodeURIComponent(id)} size={16} />,
    badge: getStateBadge(id, watchStates),
  });

  // Grouped Resource areas
  const workloadResources: NavMenuItem[] = [];
  const configResources: NavMenuItem[] = [];
  const networkResources: NavMenuItem[] = [];
  const storageResources: NavMenuItem[] = [];
  const accessControlResources: NavMenuItem[] = [];
  const admissionControlResources: NavMenuItem[] = [];
  const helmResources: NavMenuItem[] = [];

  const crds: Record<string, Array<NavMenuItem>> = {};

  Object.values(data).forEach((group) => {
    if (!group) return;
    group.resources.forEach((type) => {
        const label = types.find((entry) => entry.type === type)?.displayName ?? type;
        const navItem = withBadge(toID(type), label);
        if (primaryTypes[type]) return;
        // Unclassified catalog types remain available under their declared group.
        if (!ModernSectionMap[type]) {
          if (!crds[group.id]) {
            crds[group.id] = [];
          }
          crds[group.id].push(navItem);
        } else {
          switch (ModernSectionMap[type]) {
            case 'workload':
              workloadResources.push(navItem);
              break;
            case 'config':
              configResources.push(navItem);
              break;
            case 'network':
              networkResources.push(navItem);
              break;
            case 'storage':
              storageResources.push(navItem);
              break;
            case 'access_control':
              accessControlResources.push(navItem);
              break;
            case 'admission_control':
              admissionControlResources.push(navItem);
              break;
            case 'helm':
              helmResources.push(navItem);
              break;
          }
        }
      });
  });

  const crdChildren: NavMenuItem[] = Object.entries(crds).map(([group, entry]) => ({
    id: group,
    label: data.find((entry) => entry.id === group)?.name ?? group,
    children: entry.sort(labelSort),
    badge: getGroupBadge(entry, watchStates),
  }));

  const workloadSorted = workloadResources.sort(labelSort);
  const configSorted = configResources.sort(labelSort);
  const networkSorted = networkResources.sort(labelSort);
  const storageSorted = storageResources.sort(labelSort);
  const accessSorted = accessControlResources.sort(labelSort);
  const admissionSorted = admissionControlResources.sort(labelSort);
  const helmSorted = helmResources.sort(labelSort);
  const crdSorted = crdChildren.sort(labelSort);

  const sections: NavSection[] = [
    {
      title: '',
      items: [
        { id: '__dashboard__', label: 'Dashboard', icon: ICON_GAUGE },
        {
          id: toID('k8s:/nodes'),
          label: 'Nodes',
          icon: <ResourceIcon pluginId={PLUGIN_ID} resourceKey="k8s:/nodes" size={16} />,
          badge: getStateBadge(toID('k8s:/nodes'), watchStates),
        },
        {
          id: toID('k8s:events.k8s.io/events'),
          label: 'Events',
          icon: <ResourceIcon pluginId={PLUGIN_ID} resourceKey="k8s:events.k8s.io/events" size={16} />,
          badge: getStateBadge(toID('k8s:events.k8s.io/events'), watchStates),
        },
        {
          id: toID('k8s:/namespaces'),
          label: 'Namespaces',
          icon: <ResourceIcon pluginId={PLUGIN_ID} resourceKey="k8s:/namespaces" size={16} />,
          badge: getStateBadge(toID('k8s:/namespaces'), watchStates),
        },
        {
          id: 'workload',
          label: 'Workload',
          icon: ICON_BOXES,
          children: workloadSorted,
          badge: getGroupBadge(workloadSorted, watchStates),
        },
        {
          id: 'config',
          label: 'Config',
          icon: ICON_CLIPBOARD,
          children: configSorted,
          badge: getGroupBadge(configSorted, watchStates),
        },
        {
          id: 'network',
          label: 'Networking',
          icon: ICON_NETWORK,
          children: networkSorted,
          badge: getGroupBadge(networkSorted, watchStates),
        },
        {
          id: 'storage',
          label: 'Storage',
          icon: ICON_DATABASE,
          children: storageSorted,
          badge: getGroupBadge(storageSorted, watchStates),
        },
        {
          id: 'access_control',
          label: 'Access Control',
          icon: ICON_LOCK,
          children: accessSorted,
          badge: getGroupBadge(accessSorted, watchStates),
        },
        {
          id: 'admission_control',
          label: 'Admission Control',
          icon: ICON_TICKET,
          children: admissionSorted,
          badge: getGroupBadge(admissionSorted, watchStates),
        },
        {
          id: 'helm',
          label: 'Helm',
          icon: ICON_HELM,
          children: helmSorted,
          badge: getGroupBadge(helmSorted, watchStates),
        },
        {
          id: 'crd',
          label: 'Other API Groups',
          icon: ICON_BLOCKS,
          children: crdSorted,
          badge: getGroupBadge(
            crdSorted.flatMap((g) => g.children ?? []),
            watchStates,
          ),
        },
      ],
    },
  ];

  return sections;
};

/**
 * Provide one of number of sidebar layouts to the caller
 */
export const useSidebarLayout = ({ connectionID }: Opts) => {
  const { settings } = usePluginContext();
  const { groups } = useResourceGroups({ pluginID: PLUGIN_ID, route: { connection: connectionID } });
  const { resourceTypes } = useResourceTypes({ pluginID: PLUGIN_ID, route: { connection: connectionID } });
  const { summary, isFullySynced } = useWatchState({ pluginID: PLUGIN_ID, route: { connection: connectionID } });

  // Stabilize the watchStates reference so we don't recalculate on every
  // watch event when the actual values haven't changed.
  const watchStates = useStableObject(summary.data?.resources);

  const layoutSetting = settings[`${PLUGIN_ID}.layout`] as string | undefined;

  const [layout, setLayout] = React.useState<Array<NavSection>>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Track whether we've ever computed a layout (for debounce logic)
  const hasInitialLayout = React.useRef(false);

  /**
   * Renders the full layout divided by the API groups.
   * During active sync, debounce updates by 500ms to avoid re-computing
   * the full sidebar layout on every watch state change.
   */
  React.useEffect(() => {
    if (!groups.data) {
      return;
    }

    const compute = () => {
      setIsLoading(true);
      switch (layoutSetting) {
        case 'modern':
          setLayout(calculateModernLayout(groups.data, resourceTypes.data ?? [], watchStates));
          break;
        case 'full':
          setLayout(calculateFullLayout(groups.data, resourceTypes.data ?? [], watchStates));
          break;
        default:
          setLayout(calculateModernLayout(groups.data, resourceTypes.data ?? [], watchStates));
          break;
      }
      setIsLoading(false);
      hasInitialLayout.current = true;
    };

    // No debounce on first layout or when fully synced
    if (!hasInitialLayout.current || isFullySynced) {
      compute();
      return;
    }

    // Debounce during active sync to avoid hundreds of recalculations
    const timer = setTimeout(compute, 500);
    return () => clearTimeout(timer);
  }, [groups.data, resourceTypes.data, layoutSetting, watchStates, isFullySynced]);

  return {
    layout,
    isLoading,
  };
};
