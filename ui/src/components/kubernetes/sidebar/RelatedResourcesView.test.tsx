/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useRelatedResources: vi.fn(),
  showResourceSidebar: vi.fn(),
}));

const labels: Record<string, Record<string, string>> = {
  owns: { outgoing: 'Owns', incoming: 'Owned by' },
  runs_on: { outgoing: 'Runs on', incoming: 'Running here' },
  uses: { outgoing: 'Uses', incoming: 'Used by' },
  selects: { outgoing: 'Selects', incoming: 'Selected by' },
};

vi.mock('@omniviewdev/runtime', () => ({
  useRelatedResources: (...args: unknown[]) => mocks.useRelatedResources(...args),
  relationshipLabel: (type: string, direction: string) => labels[type]?.[direction] ?? type,
  useRightDrawer: () => ({ showResourceSidebar: mocks.showResourceSidebar }),
}));

import RelatedResourcesView, { groupRelated } from './RelatedResourcesView';

const node = (resourceKey: string, id: string, namespace = '') => ({
  pluginId: 'kubernetes',
  connectionId: 'conn-1',
  resourceKey,
  id,
  namespace,
});

const ctx = {
  data: { metadata: { name: 'web-1', namespace: 'default' } },
  // Drawers opened from tables carry the UID here, not the name.
  resource: {
    id: '0f6c1e2a-uid',
    key: 'core::v1::Pod',
    connectionID: 'conn-1',
    pluginID: 'kubernetes',
  },
};

const podRelated = [
  {
    resource: node('core::v1::Secret', 'tls', 'default'),
    type: 'uses',
    direction: 'outgoing',
    label: 'uses',
  },
  {
    resource: node('core::v1::ConfigMap', 'app-config', 'default'),
    type: 'uses',
    direction: 'outgoing',
    label: 'uses',
  },
  {
    resource: node('core::v1::Node', 'worker-1'),
    type: 'runs_on',
    direction: 'outgoing',
    label: 'runs on',
  },
  {
    resource: node('apps::v1::ReplicaSet', 'web-abc', 'default'),
    type: 'owns',
    direction: 'incoming',
    label: 'owned by',
  },
  {
    resource: node('core::v1::Service', 'web', 'default'),
    type: 'selects',
    direction: 'incoming',
    label: 'selects',
  },
];

function hookResult(overrides: Record<string, unknown> = {}) {
  return {
    related: [],
    edges: [],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('groupRelated', () => {
  it('puts owners first and sorts entries by kind then name', () => {
    const groups = groupRelated(podRelated as never);

    expect(groups.map((g) => g.title)).toEqual(['Owned by', 'Runs on', 'Selected by', 'Uses']);
    expect(groups[3].items.map((i) => i.resource.id)).toEqual(['app-config', 'tls']);
  });

  it('drops duplicate edges to the same resource', () => {
    const dup = [podRelated[0], { ...podRelated[0] }];
    expect(groupRelated(dup as never)[0].items).toHaveLength(1);
  });
});

describe('RelatedResourcesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries the graph for the drawer resource', () => {
    mocks.useRelatedResources.mockReturnValue(hookResult());
    render(<RelatedResourcesView ctx={ctx as never} />);

    expect(mocks.useRelatedResources).toHaveBeenCalledWith({
      pluginID: 'kubernetes',
      connectionID: 'conn-1',
      resourceKey: 'core::v1::Pod',
      resourceID: 'web-1',
      namespace: 'default',
    });
  });

  it('renders grouped sections and opens a related resource', () => {
    mocks.useRelatedResources.mockReturnValue(hookResult({ related: podRelated }));
    render(<RelatedResourcesView ctx={ctx as never} />);

    expect(screen.getByText('Owned by (1)')).toBeInTheDocument();
    expect(screen.getByText('Uses (2)')).toBeInTheDocument();
    expect(screen.getByText('ReplicaSet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'worker-1' }));
    expect(mocks.showResourceSidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceKey: 'core::v1::Node',
        resourceID: 'worker-1',
        connectionID: 'conn-1',
      }),
    );
  });

  it('prefixes resources in another namespace', () => {
    mocks.useRelatedResources.mockReturnValue(
      hookResult({
        related: [
          {
            resource: node('core::v1::Secret', 'shared', 'infra'),
            type: 'uses',
            direction: 'outgoing',
            label: 'uses',
          },
        ],
      }),
    );
    render(<RelatedResourcesView ctx={ctx as never} />);

    expect(screen.getByRole('button', { name: 'infra/shared' })).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    mocks.useRelatedResources.mockReturnValue(hookResult());
    render(<RelatedResourcesView ctx={ctx as never} />);

    expect(screen.getByText('No related resources')).toBeInTheDocument();
  });

  it('shows errors', () => {
    mocks.useRelatedResources.mockReturnValue(hookResult({ error: new Error('boom') }));
    render(<RelatedResourcesView ctx={ctx as never} />);

    expect(screen.getByText('Could not load related resources')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });
});

describe('RelatedResourcesView on a host without graph hooks', () => {
  it('asks for a newer Omniview instead of crashing', async () => {
    vi.resetModules();
    // SystemJS resolves exports the host lacks to undefined.
    vi.doMock('@omniviewdev/runtime', () => ({
      useRelatedResources: undefined,
      relationshipLabel: undefined,
      useRightDrawer: () => ({ showResourceSidebar: vi.fn() }),
    }));
    const { default: View } = await import('./RelatedResourcesView');

    render(<View ctx={ctx as never} />);
    expect(screen.getByText('Update Omniview to see related resources')).toBeInTheDocument();
    vi.doUnmock('@omniviewdev/runtime');
  });
});
