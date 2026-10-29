import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKubernetesResources } from './useKubernetesResources';

const mocks = vi.hoisted(() => ({
  types: vi.fn(), resolve: vi.fn(), resources: vi.fn(), decode: vi.fn(),
}));
vi.mock('@omniviewdev/runtime', () => ({
  useResourceTypes: () => ({ resourceTypes: mocks.types() }),
  useResolvedResourceTarget: mocks.resolve,
  useResources: (options: { request?: unknown }) => {
    const result = mocks.resources(options);
    return { ...result, refreshAcquiredPage: result.resources.refetch, acquired: options.request && result.resources.data ? { request: options.request, page: result.resources.data } : undefined };
  },
  valueToJSON: mocks.decode,
}));

describe('useKubernetesResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.types.mockReturnValue({ data: [{
      type: 'k8s:/pods', queryDimensions: [{ name: 'namespace' }],
      representations: [{ id: 'native' }], defaultRepresentation: 'native',
      capabilities: [{ operation: 'update', guarantee: 'bestEffort' }],
    }], isLoading: false });
    mocks.resolve.mockReturnValue({ data: {
      targetId: 'host-membership', target: { authority: 'host-authority' },
    }, isLoading: false });
    mocks.resources.mockReturnValue({ resources: {
      data: { records: [{ key: 'host-key', record: { body: { kind: 'int64', value: '9007199254740993' } } }] },
      isLoading: false,
    }, guarantee: 'bestEffort' });
    mocks.decode.mockReturnValue(9007199254740993n);
  });

  it('uses explicit route, declared namespace dimension, and host membership for live reads', () => {
    const { result } = renderHook(() => useKubernetesResources({
      connectionID: 'selected-cluster', resourceType: 'k8s:/pods', namespaces: ['team'],
    }));
    expect(mocks.resolve).toHaveBeenCalledWith(expect.objectContaining({
      route: { connection: 'selected-cluster' }, type: 'k8s:/pods', representation: 'native',
      scope: [{ dimension: 'namespace', match: 'oneOf', values: ['team'] }],
    }));
    expect(mocks.resources).toHaveBeenCalledWith(expect.objectContaining({
      request: { targetId: 'host-membership', request: { target: { authority: 'host-authority' }, pageSize: 200, cursor: undefined } },
      live: true,
    }));
    expect(result.current.bodies).toEqual([9007199254740993n]);
    expect(result.current.records[0].key).toBe('host-key');
  });

  it('does not add namespace scope to cluster-scoped types', () => {
    mocks.types.mockReturnValue({ data: [{
      type: 'k8s:/nodes', queryDimensions: [], representations: [{ id: 'native' }], defaultRepresentation: 'native',
      capabilities: [],
    }], isLoading: false });
    renderHook(() => useKubernetesResources({
      connectionID: 'selected-cluster', resourceType: 'k8s:/nodes', namespaces: ['team'],
    }));
    expect(mocks.resolve).toHaveBeenCalledWith(expect.objectContaining({ scope: [] }));
    expect(mocks.resources).toHaveBeenCalledWith(expect.objectContaining({ live: false }));
  });

  it('does not admit a request before catalog and host resolution', () => {
    mocks.types.mockReturnValue({ data: [], isLoading: false });
    mocks.resolve.mockReturnValue({ data: undefined, isLoading: false });
    renderHook(() => useKubernetesResources({ connectionID: '', resourceType: 'k8s:/pods' }));
    expect(mocks.resources).toHaveBeenCalledWith(expect.objectContaining({ request: undefined, enabled: false }));
  });

  it('exposes explicit continuation without draining or accumulating rows', () => {
    mocks.resources.mockReturnValue({ resources: { data: {
      records: [{ key: 'first', record: { body: {} } }],
      sourcePage: { nextCursor: 'native/source/cursor', count: { kind: 'unknown' }, consistency: 'bestEffort' },
    }, isLoading: false } });
    const { result, rerender } = renderHook(() => useKubernetesResources({ connectionID: 'selected', resourceType: 'k8s:/pods' }));
    expect(mocks.resources).toHaveBeenCalledTimes(1);
    expect(result.current.sourcePage?.count.kind).toBe('unknown');
    act(() => result.current.pagination.nextPage(result.current.sourcePage?.nextCursor));
    expect(mocks.resources).toHaveBeenLastCalledWith(expect.objectContaining({
      request: expect.objectContaining({ request: expect.objectContaining({ cursor: 'native/source/cursor', pageSize: 200 }) }),
    }));
    mocks.resources.mockReturnValue({ resources: { data: { records: [{ key: 'second', record: { body: {} } }], sourcePage: { count: { kind: 'unknown' } } }, isLoading: false } });
    rerender();
    expect(result.current.records.map(({ key }) => key)).toEqual(['second']);
    act(() => result.current.pagination.previousPage());
    expect(mocks.resources).toHaveBeenLastCalledWith(expect.objectContaining({
      request: expect.objectContaining({ request: expect.objectContaining({ cursor: undefined }) }),
    }));
  });

  it('never sends a previous target cursor to a newly resolved membership', () => {
    const { result, rerender } = renderHook(() => useKubernetesResources({ connectionID: 'selected', resourceType: 'k8s:/pods' }));
    act(() => result.current.pagination.nextPage('old-cursor'));
    mocks.resolve.mockReturnValue({ data: { targetId: 'new-membership', target: { authority: 'new-authority' } }, isLoading: false });
    rerender();
    expect(mocks.resources).toHaveBeenLastCalledWith(expect.objectContaining({
      request: { targetId: 'new-membership', request: { target: { authority: 'new-authority' }, pageSize: 200, cursor: undefined } },
    }));
  });

  it('preserves visible-page advisory updates and exposes explicit stale-page refresh', () => {
    const refetch = vi.fn();
    mocks.resources.mockReturnValue({
      resources: { data: { records: [], sourcePage: { count: { kind: 'unknown' } } }, isFetching: false, refetch },
      membershipStale: true,
    });
    const { result } = renderHook(() => useKubernetesResources({ connectionID: 'selected', resourceType: 'k8s:/pods' }));
    expect(mocks.resources).toHaveBeenLastCalledWith(expect.objectContaining({ live: true }));
    expect(result.current.pageControls.membershipStale).toBe(true);
    expect(refetch).not.toHaveBeenCalled();
    act(() => result.current.pageControls.refresh?.());
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
