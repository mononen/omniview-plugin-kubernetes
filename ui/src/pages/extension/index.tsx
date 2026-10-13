import type { ExtensionContributionRegistration } from '@omniviewdev/runtime';
import { useExtensionPoint } from '@omniviewdev/runtime';
import React from 'react';
import { useParams } from 'react-router-dom';

/**
 * Extension point for full pages inside a cluster, listed in the cluster's
 * side navigation next to Dashboard. Contributions provide a component and
 * `meta: { path, icon? }`.
 */
export const CLUSTER_PAGE_EXTENSION_POINT_ID = 'kubernetes/cluster/page';

/** Route and nav-item prefix; static so a page can never shadow a resource key. */
export const CLUSTER_PAGE_PREFIX = 'page/';

export type ClusterPageProps = { pluginID: string; connectionID: string };
export type ClusterPageContribution = ExtensionContributionRegistration<React.FC<ClusterPageProps>>;

type ClusterPageMeta = { path?: string; icon?: React.ReactNode };

export const clusterPagePath = (page: ClusterPageContribution): string =>
  (page.meta as ClusterPageMeta | undefined)?.path ?? encodeURIComponent(page.id);

export const clusterPageIcon = (page: ClusterPageContribution): React.ReactNode =>
  (page.meta as ClusterPageMeta | undefined)?.icon;

export const useClusterPages = (): ClusterPageContribution[] =>
  useExtensionPoint<React.FC<ClusterPageProps>>(CLUSTER_PAGE_EXTENSION_POINT_ID)?.list() ?? [];

/** Renders the cluster page contributed by another plugin for the current path. */
const ClusterExtensionPage: React.FC = () => {
  const { id = '', pagePath = '' } = useParams<{ id: string; pagePath: string }>();
  const page = useClusterPages().find((p) => clusterPagePath(p) === pagePath);

  if (!page) return null;

  const Component = page.value;
  return <Component pluginID="kubernetes" connectionID={id} />;
};

export default ClusterExtensionPage;
