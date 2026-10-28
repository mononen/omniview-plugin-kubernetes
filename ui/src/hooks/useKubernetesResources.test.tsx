import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKubernetesResources } from './useKubernetesResources';

const mocks = vi.hoisted(() => ({
  types: vi.fn(), resolve: vi.fn(), resources: vi.fn(), decode: vi.fn(),
}));
vi.mock('@omniviewdev/runtime', () => ({
  useResourceTypes: mocks.types,
  useResolvedResourceTarget: mocks.resolve,
  useResources: mocks.resources,
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
      request: { targetId: 'host-membership', request: { target: { authority: 'host-authority' }, pageSize: 200 } },
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
});
