import { useMemo } from 'react';
import { useResourceTypes, useResolvedResourceTarget, useResources, valueToJSON } from '@omniviewdev/runtime';
import { useSourcePageNavigation } from './useSourcePageNavigation';

import { PLUGIN_ID } from '@/pluginId';
/** Kubernetes presentation adapter. Only the host resolves authority and membership. */
export function useKubernetesResources<T>({
  pluginID = PLUGIN_ID, connectionID, resourceType, namespaces = [], enabled = true,
}: {
  pluginID?: string;
  connectionID: string;
  resourceType: string;
  namespaces?: string[];
  enabled?: boolean;
}) {
  const route = { connection: connectionID };
  const { resourceTypes } = useResourceTypes({ pluginID, route });
  const descriptor = resourceTypes.data?.find((entry) => entry.type === resourceType);
  const representation = descriptor?.defaultRepresentation;
  const scope = descriptor?.queryDimensions.map(({ name }) =>
    name === 'namespace' && namespaces.length
      ? { dimension: name, match: 'oneOf' as const, values: namespaces }
      : { dimension: name, match: 'any' as const });
  const target = useResolvedResourceTarget({
    pluginID, route, type: resourceType, representation, scope,
    enabled: enabled && !!descriptor,
  });
  const navigation = useSourcePageNavigation(JSON.stringify([pluginID, route, resourceType, representation, scope, target.data]));
  const result = useResources({
    pluginID,
    request: target.data && {
      targetId: target.data.targetId,
      request: { target: target.data.target, pageSize: 200, cursor: navigation.cursor },
    },
    enabled: enabled && !!target.data,
    live: descriptor?.capabilities.some(({ operation }) => operation === 'update') ?? false,
  });
  const pagination = result.acquired ? navigation.forAcquiredPage(result.acquired.request.request.cursor) : navigation;
  const records = result.acquired?.page.records;
  const bodies = useMemo(() => (records ?? []).map(({ record }) => valueToJSON(record.body) as T), [records]);
  return {
    ...result,
    pagination,
    pageControls: {
      pagination,
      nextCursor: result.acquired?.page.sourcePage?.nextCursor,
      loading: enabled && (resourceTypes.isLoading || target.isLoading || result.resources.isFetching),
      refresh: target.data ? result.refreshAcquiredPage : undefined,
      membershipStale: result.membershipStale,
      error: resourceTypes.error ?? target.error ?? result.resources.error,
      retry: target.data ? () => { void result.resources.refetch(); } : undefined,
    },
    sourcePage: result.acquired?.page.sourcePage,
    records: records ?? [],
    bodies,
    isLoading: enabled && (resourceTypes.isLoading || target.isLoading || (result.resources.isLoading && !result.acquired)),
    error: resourceTypes.error ?? target.error ?? result.resources.error,
  };
}
