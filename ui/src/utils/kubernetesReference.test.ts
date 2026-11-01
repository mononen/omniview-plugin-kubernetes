import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveKubernetesReference } from './kubernetesReference';

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), resolve: vi.fn() }));
vi.mock('@/pluginId', () => ({ PLUGIN_ID: 'kubernetes-preview' }));
vi.mock('@omniviewdev/runtime/api', () => ({ ResourceClient: {
  Catalog: mocks.catalog, ResolveReference: mocks.resolve,
} }));

describe('Kubernetes reference transport identity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses build identity for host transport without rewriting canonical provider or type', async () => {
    const resolved = {
      route: { connection: 'host-route' },
      reference: { address: { provider: 'kubernetes', authority: 'host-authority',
        type: 'k8s:/pods', id: 'api', scope: [{ dimension: 'namespace', value: 'apps' }] }, incarnation: 'uid-1' },
      representation: 'native', targetId: 'host-membership',
    };
    mocks.catalog.mockResolvedValue({ types: [{ type: 'k8s:/pods', identityDimensions: [{ name: 'namespace' }] }] });
    mocks.resolve.mockResolvedValue(resolved);

    const result = await resolveKubernetesReference({ connectionID: 'selected', resourceType: 'k8s:/pods',
      name: 'api', namespace: 'apps', incarnation: 'uid-1' });

    expect(mocks.catalog).toHaveBeenCalledWith('kubernetes-preview', { route: { connection: 'selected' } });
    expect(mocks.resolve).toHaveBeenCalledWith('kubernetes-preview', {
      route: { connection: 'selected' }, type: 'k8s:/pods', id: 'api', incarnation: 'uid-1',
      scope: [{ dimension: 'namespace', value: 'apps' }],
    });
    expect(result).toBe(resolved);
    expect(result.reference.address.provider).toBe('kubernetes');
    expect(result.reference.address.type).toBe('k8s:/pods');
  });
});
