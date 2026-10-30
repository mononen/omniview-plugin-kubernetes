import {
  ErrorTypes, isCancelledError, parseAppError, valueToJSON, useExtensionRegistry,
  type ExtensionPointRegistryContract, type SearchActionReferenceV1, type SearchExecutionContextV1,
  type SearchProviderItemV1, type SearchProviderRequestV1, type SearchProviderResponseV1,
  type SearchProviderV1, type SearchScopeV1,
} from '@omniviewdev/runtime';
import { DataClient, ResourceClient } from '@omniviewdev/runtime/api';
import { ConnectionStatusCode } from '@omniviewdev/runtime/models';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import KubernetesSearchActionContext, {
  searchActions, executeSearchAction, validateSearchAction, freshTarget,
} from '../components/kubernetes/KubernetesSearchActionContext';
import {
  CLUSTER_PAGE_EXTENSION_POINT_ID, clusterPageChildren, clusterPagePath,
  type ClusterPageProps,
} from '../pages/extension';
import type { NavSection } from '../types/navigation';
import { plural } from '../utils/language';

import { destinationPath, destinationScore, prependRecent, searchDestinations, type SearchDestination } from './navigation';

import { PLUGIN_ID } from '@/pluginId';

const PLUGIN = PLUGIN_ID;
const OPEN_TYPE = `${PLUGIN}:open-type:`;
const OPEN_LIST = `${PLUGIN}:open-list`;
const OPEN_RESOURCE = `${PLUGIN}:open-resource`;
const CONNECT = `${PLUGIN}:connect`;
const layouts = new Map<string, SearchDestination[]>();
let extensionRegistry: ExtensionPointRegistryContract | undefined;
let queryClient: QueryClient | undefined;


const connectionID = (scope: SearchScopeV1): string => scope.kind === 'connection' ? scope.connectionId
  : scope.kind === 'resource-type' ? scope.target.route.connection : scope.route.connection;
const namespace = (scope: Extract<SearchScopeV1, { kind: 'resource' }>): string =>
  scope.reference.address.scope.find(entry => entry.dimension === 'namespace')?.value ?? '';
/** Share the rendered sidebar's live ordering, disabled states, and contributed destinations. */
export function useKubernetesSearchNavigation(connectionID: string, layout: NavSection[]): void {
  useEffect(() => {
    const destinations = searchDestinations(layout);
    layouts.set(connectionID, destinations);
    return () => { if (layouts.get(connectionID) === destinations) layouts.delete(connectionID); };
  }, [connectionID, layout]);
}

function Context() {
  const registry = useExtensionRegistry();
  const client = useQueryClient();
  useEffect(() => {
    queryClient = client;
    extensionRegistry = registry;
    return () => {
      if (extensionRegistry === registry) extensionRegistry = undefined;
      if (queryClient === client) queryClient = undefined;
    };
  }, [registry, client]);
  return <KubernetesSearchActionContext />;
}

async function read<T>(operation: PromiseLike<T> & { cancel?: () => void }, signal: AbortSignal): Promise<T> {
  const abort = () => operation.cancel?.();
  if (signal.aborted) {
    abort();
    void Promise.resolve(operation).catch(() => undefined);
    signal.throwIfAborted();
  }
  signal.addEventListener('abort', abort, { once: true });
  try { const value = await operation; signal.throwIfAborted(); return value; }
  finally { signal.removeEventListener('abort', abort); }
}

function actionRow(id: string, label: string, target: SearchScopeV1, description: string, scope?: SearchScopeV1): SearchProviderItemV1 {
  return { id, label, value: { schemaVersion: 1, kind: 'action', action: { id, target, ...(id === CONNECT ? { recovery: 'connection' as const } : {}) }, description, ...(scope ? { scope } : {}) } };
}

function connectionScope(scope: SearchScopeV1): Extract<SearchScopeV1, { kind: 'connection' }> {
  return { kind: 'connection', pluginId: PLUGIN, connectionId: connectionID(scope), label: connectionID(scope) };
}

function cache(): QueryClient {
  if (!queryClient) throw new Error('Kubernetes search context is unavailable.');
  return queryClient;
}

async function ready(scope: SearchScopeV1, signal: AbortSignal, fresh = false): Promise<boolean> {
  const status = fresh
    ? await read(ResourceClient.CheckConnection(PLUGIN, connectionID(scope)), signal)
    : await cache().fetchQuery({
      queryKey: ['search-connection-status', PLUGIN, connectionID(scope)],
      staleTime: 2_000, retry: false,
      queryFn: ({ signal: cacheSignal }) => read(ResourceClient.CheckConnection(PLUGIN, connectionID(scope)), cacheSignal),
    });
  signal.throwIfAborted();
  if (status.status === ConnectionStatusCode.ConnectionStatusUnauthorized || status.status === ConnectionStatusCode.ConnectionStatusForbidden) {
    const unauthorized = status.status === ConnectionStatusCode.ConnectionStatusUnauthorized;
    throw Object.assign(new Error(unauthorized ? 'Authentication required.' : 'Access denied.'), {
      type: unauthorized ? ErrorTypes.RESOURCE_UNAUTHORIZED : ErrorTypes.RESOURCE_FORBIDDEN,
      status: unauthorized ? 401 : 403,
      title: unauthorized ? 'Authentication required' : 'Access denied',
      detail: unauthorized ? 'Refresh connection credentials before searching.' : 'Current credentials cannot access these resources.',
    });
  }
  if (status.status === ConnectionStatusCode.ConnectionStatusPending) {
    throw Object.assign(new Error('Connection is starting.'), {
      type: ErrorTypes.CONNECTION_FAILED, status: 503, title: 'Connecting', detail: 'Connection is starting.',
      code: 'CONNECTION_PENDING',
    });
  }
  if (status.status === ConnectionStatusCode.ConnectionStatusError && status.error === 'client is required') return false;
  if (status.status !== ConnectionStatusCode.ConnectionStatusConnected && status.status !== ConnectionStatusCode.ConnectionStatusDisconnected) {
    throw new Error(status.details || 'Connection is unavailable. Review its status before retrying.');
  }
  return status.status === ConnectionStatusCode.ConnectionStatusConnected;
}

async function destinations(connectionID: string, signal: AbortSignal): Promise<SearchDestination[]> {
  const active = layouts.get(connectionID);
  const catalog = await read(ResourceClient.Catalog(PLUGIN, { route: { connection: connectionID } }), signal);
  if (active?.length) return active.map(item => {
    const type = catalog.types.find(type => encodeURIComponent(type.type) === item.id);
    return type ? { ...item, resourceKey: type.type } : item;
  });
  const items: SearchDestination[] = [{ id: '__dashboard__', label: 'Dashboard', category: 'General', disabled: false }];
  for (const meta of catalog.types) {
    items.push({ id: encodeURIComponent(meta.type), resourceKey: meta.type, label: plural(meta.displayName),
      category: 'Resources', disabled: false });
  }
  const pages = extensionRegistry?.getExtensionPoint<React.FC<ClusterPageProps>>(CLUSTER_PAGE_EXTENSION_POINT_ID)?.listAll();
  for (const page of pages ?? []) {
    const id = `page/${clusterPagePath(page)}`;
    items.push({ id, label: page.label, category: 'Pages', disabled: false });
    for (const child of clusterPageChildren(page)) items.push({ id: `${id}/${child.path}`, label: child.label, category: page.label, disabled: false });
  }
  return items;
}

async function recentIDs(connectionID: string, signal: AbortSignal): Promise<string[]> {
  const value: unknown = await read(DataClient.Get(PLUGIN, `palette_recent_${connectionID}`), signal);
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, 8) : [];
}

function metadata(value: unknown): { name: string; namespace: string; uid?: string } | undefined {
  if (!value || typeof value !== 'object' || !('metadata' in value)) return undefined;
  const meta = value.metadata;
  if (!meta || typeof meta !== 'object' || !('name' in meta) || typeof meta.name !== 'string' || !meta.name) return undefined;
  return { name: meta.name, namespace: 'namespace' in meta && typeof meta.namespace === 'string' ? meta.namespace : '',
    ...('uid' in meta && typeof meta.uid === 'string' ? { uid: meta.uid } : {}) };
}

function validateResource(target: Extract<SearchScopeV1, { kind: 'resource' }>, data: unknown): boolean {
  const meta = metadata(data);
  return Boolean(meta && meta.name === target.reference.address.id && meta.namespace === namespace(target) &&
    (target.reference.incarnation === undefined || meta.uid === target.reference.incarnation));
}


function empty(): SearchProviderResponseV1 { return { items: [], completion: 'complete' }; }

async function search(request: SearchProviderRequestV1): Promise<SearchProviderResponseV1> {
  const scope = request.scopes.at(-1);
  if (!scope || scope.pluginId !== PLUGIN) return empty();
  const { signal, query, limit } = request;
  try {
    if (!await ready(scope, signal)) return { completion: 'complete', status: 'disconnected',
      message: 'Connection is disconnected. Connect explicitly to search live resources.',
      items: [actionRow(CONNECT, 'Connect and continue', connectionScope(scope), 'Keep this scope and search query.')] };
    if (scope.kind === 'connection') {
      const available = await destinations(scope.connectionId, signal);
      let recents: string[] = [];
      let historyUnavailable = false;
      try { recents = await recentIDs(scope.connectionId, signal); }
      catch (error) { if (signal.aborted || isCancelledError(error)) throw error; historyUnavailable = true; }
      const scored = available.map((item, order) => ({ item, order,
        score: destinationScore(query, item.label, `${item.category} ${item.resourceKey ?? ''}`), recent: recents.indexOf(item.id) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || (!query.trim() ? (a.recent < 0 ? 8 : a.recent) - (b.recent < 0 ? 8 : b.recent) : 0) || a.order - b.order);
      const catalog = await read(ResourceClient.Catalog(PLUGIN, { route: { connection: scope.connectionId } }), signal);
      const items = await Promise.all(scored.slice(0, limit).map(async ({ item, recent }) => {
        let child: SearchScopeV1 = scope;
        if (item.resourceKey) {
          const type = catalog.types.find(type => type.type === item.resourceKey);
          const representation = type?.defaultRepresentation
            ?? (type?.representations.length === 1 ? type.representations[0].id : undefined);
          if (!representation) throw new Error('Resource representation requires an explicit catalog choice.');
          const resolved = await read(ResourceClient.ResolveTarget(PLUGIN, {
            route: { connection: scope.connectionId }, type: item.resourceKey, representation,
          }), signal);
          child = { kind: 'resource-type', pluginId: PLUGIN, target: resolved.target, targetId: resolved.targetId,
            label: item.label, scopeLabel: 'Namespace' };
        }
        const row = actionRow(OPEN_TYPE + encodeURIComponent(item.id), item.label, child,
          `${recent >= 0 && !query.trim() ? 'Recent · ' : ''}${item.category}`, item.resourceKey ? child : undefined);
        if (item.disabled) row.value.availability = { state: 'disabled', reason: 'This destination is currently unavailable.' };
        return row;
      }));
      return { items, completion: scored.length > limit ? 'truncated' : 'complete',
        ...(historyUnavailable ? { status: 'partial', message: 'Recent destinations are unavailable. Resource navigation remains available.' } : {}) };
    }
    if (scope.kind === 'resource-type') {
      const list = await cache().fetchQuery({
        queryKey: ['kubernetes-search-page', scope.targetId],
        staleTime: 15_000, retry: false,
        queryFn: ({ signal: cacheSignal }) => read(ResourceClient.Enumerate(PLUGIN, {
          targetId: scope.targetId, request: { target: scope.target, pageSize: 200 },
        }), cacheSignal),
      });
      signal.throwIfAborted();
      const resources = list.records;
      const matches = resources.flatMap(envelope => {
        if (envelope.targetId !== scope.targetId) throw new Error('Resource target membership mismatch.');
        const data = valueToJSON(envelope.record.body);
        const meta = metadata(data);
        if (!meta) return [];
        const score = destinationScore(query, meta.name, meta.namespace);
        if (!score) return [];
        const target: SearchScopeV1 = { kind: 'resource', pluginId: PLUGIN,
          reference: envelope.record.reference, route: envelope.route, targetId: envelope.targetId,
          representation: envelope.record.representation.id, label: meta.name, scopeLabel: 'Namespace' };
        if (!validateResource(target, data)) throw new Error('Kubernetes resource identity mismatch.');
        return [{ score, row: { ...actionRow(OPEN_RESOURCE, meta.name, target,
          `${meta.namespace || 'Cluster scoped'} · ${scope.label}`, target), id: envelope.key } }];
      }).sort((a, b) => b.score - a.score || a.row.label.localeCompare(b.row.label));
      const queryCharacters = Array.from(query);
      const preview = queryCharacters.slice(0, 80).join('') + (queryCharacters.length > 80 ? '…' : '');
      const listRow = actionRow(OPEN_LIST, query ? `Open ${scope.label} list matching “${preview}”` : `Open ${scope.label} list`, scope,
        'Preserve existing namespace and structured table filters.');
      if (listRow.value.kind === 'action') listRow.value.action.query = query;
      const count = list.sourcePage.count;
      const incomplete = Boolean(list.sourcePage.nextCursor) || count?.kind !== 'exact'
        || count.value === undefined || BigInt(count.value) > BigInt(resources.length)
        || list.sourcePage.coverage.kind !== 'complete';
      return { items: [...matches.slice(0, Math.max(0, limit - 1)).map(item => item.row), listRow],
        completion: incomplete || matches.length >= limit ? 'truncated' : 'complete',
        message: `Local ranking over ${resources.length} acquired resources only; not a host query.`
          + (incomplete ? ' Source coverage is bounded or unknown.' : '') };
    }
    const resource = await cache().fetchQuery({
      queryKey: ['kubernetes-search-resource', scope.targetId, scope.reference],
      staleTime: 15_000, retry: false,
      queryFn: ({ signal: cacheSignal }) => read(ResourceClient.Get(PLUGIN,
        { targetId: scope.targetId, request: { reference: scope.reference, route: scope.route, representation: scope.representation } }), cacheSignal),
    });
    signal.throwIfAborted();
    if (resource.targetId !== scope.targetId || !validateResource(scope, valueToJSON(resource.record.body))) return {
      ...empty(), status: 'unavailable',
      message: 'This resource was removed or replaced. Remove its scope and choose another resource.',
    };
    const rows = [actionRow(OPEN_RESOURCE, 'Open details', scope, `${namespace(scope) || 'Cluster scoped'} · ${scope.label}`),
      ...await searchActions(scope, signal, valueToJSON(resource.record.body))];
    const matches = rows.map(row => ({ row, score: destinationScore(query, row.label, row.value.description) }))
      .filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    return { items: matches.slice(0, limit).map(item => item.row), completion: matches.length > limit ? 'truncated' : 'complete' };
  } catch (error) {
    if (signal.aborted || isCancelledError(error)) throw error;
    const safe = parseAppError(error);
    if (safe.code === 'CONNECTION_PENDING') return { ...empty(), status: 'connecting', message: 'Connection is starting. Search will update when it is ready.' };
    if (safe.status === 401 || safe.type === ErrorTypes.RESOURCE_UNAUTHORIZED) return { completion: 'complete', status: 'authentication-required',
      message: 'Authentication is required. Review connection credentials, then reconnect explicitly.',
      items: [{ id: 'credentials', label: 'Review connection credentials', value: { schemaVersion: 1, kind: 'navigation',
        target: { kind: 'plugin', pluginId: PLUGIN, path: `/cluster/${encodeURIComponent(connectionID(scope))}/edit` } } },
        actionRow(CONNECT, 'Reconnect and continue', connectionScope(scope), 'Retry with refreshed credentials.')] };
    if (safe.status === 403 || safe.type === ErrorTypes.RESOURCE_FORBIDDEN) return { ...empty(), status: 'forbidden', message: 'Current credentials cannot access these resources.' };
    if (safe.status === 404 || safe.type === ErrorTypes.RESOURCE_NOT_FOUND) return {
      ...empty(), status: 'unavailable', message: 'This resource is no longer available. Remove its scope and choose another resource.',
    };
    return { completion: 'complete', status: 'unavailable', message: safe.detail,
      items: safe.recovery === 'reconnect'
        ? [actionRow(CONNECT, 'Reconnect and continue', connectionScope(scope), 'Reconnect explicitly, then retry this search.')]
        : [] };
  }
}

async function validateAction(action: SearchActionReferenceV1, context: SearchExecutionContextV1): Promise<boolean> {
  const { target, id } = action;
  if (target.pluginId !== PLUGIN) return false;
  if (id === CONNECT) return target.kind === 'connection';
  if (id.startsWith(OPEN_TYPE)) {
    const navID = decodeURIComponent(id.slice(OPEN_TYPE.length));
    return (await destinations(connectionID(target), context.signal)).some(item => item.id === navID && !item.disabled &&
      (item.resourceKey ? target.kind === 'resource-type' && target.target.type === item.resourceKey : target.kind === 'connection'));
  }
  if (id === OPEN_LIST) return target.kind === 'resource-type' &&
    (await destinations(connectionID(target), context.signal)).some(item => item.resourceKey === target.target.type && !item.disabled);
  if (id === OPEN_RESOURCE) return target.kind === 'resource';
  return validateSearchAction(action, context);
}

async function executeAction(action: SearchActionReferenceV1, context: SearchExecutionContextV1): Promise<void | { keepOpen: true }> {
  const { target, id } = action;
  context.signal.throwIfAborted();
  if (target.pluginId !== PLUGIN) throw new Error('This action belongs to another plugin.');
  if (id === CONNECT) {
    if (target.kind !== 'connection') throw new Error('Connection recovery requires a connection target.');
    // Once dispatched, closing search only fences feedback; it does not cancel connection work.
    let status;
    try { status = await ResourceClient.StartConnection(PLUGIN, target.connectionId); }
    finally { void cache().invalidateQueries({ queryKey: ['search-connection-status', PLUGIN, target.connectionId] }); }
    context.signal.throwIfAborted();
    if (status.status !== ConnectionStatusCode.ConnectionStatusConnected) throw new Error('Connection is not ready. Review credentials and retry.');
    return { keepOpen: true };
  }
  if (id === OPEN_RESOURCE && target.kind === 'resource') {
    await freshTarget(target, context.signal);
    context.signal.throwIfAborted();
    await context.openResource(target);
    return;
  }
  if (!await ready(target, context.signal, true)) throw new Error('Connection is disconnected. Connect explicitly before continuing.');
  if (id.startsWith(OPEN_TYPE) || id === OPEN_LIST) {
    if (!await validateAction(action, context)) throw new Error('This action is no longer available. Search again.');
    const navID = id.startsWith(OPEN_TYPE) ? decodeURIComponent(id.slice(OPEN_TYPE.length)) :
      target.kind === 'resource-type' ? encodeURIComponent(target.target.type) : '';
    const query = id === OPEN_LIST ? action.query ?? '' : undefined;
    // History is auxiliary; a storage outage must not block navigation.
    try { const recent = await recentIDs(connectionID(target), context.signal);
      await read(DataClient.Set(PLUGIN, `palette_recent_${connectionID(target)}`, prependRecent(recent, navID)), context.signal);
    } catch (error) { if (context.signal.aborted || isCancelledError(error)) throw error; }
    context.signal.throwIfAborted();
    context.navigate({ kind: 'plugin', pluginId: PLUGIN, path: destinationPath(connectionID(target), navID, query) });
    return;
  }
  await executeSearchAction(action, context);
}

export const kubernetesSearchProvider: SearchProviderV1 = {
  schemaVersion: 1, kind: 'provider', Context, search, validateAction, executeAction,
  connectionRecovery: 'provider', validateResource,
  supportsScope: (scopes) => scopes.length > 0 && scopes.every(scope => scope.pluginId === PLUGIN),
  connectionTarget: (connectionID) => ({
    kind: 'plugin', pluginId: PLUGIN, path: destinationPath(connectionID, '__dashboard__'),
  }),
};
