/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useRelatedResources: vi.fn(),
  link: vi.fn(),
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
}));

vi.mock('@omniviewdev/runtime/api', () => ({ ResourceClient: {} }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: new Map(Object.entries({
    'k8s:/secrets': 'Secret', 'k8s:/configmaps': 'ConfigMap', 'k8s:/nodes': 'Node',
    'k8s:apps/replicasets': 'ReplicaSet', 'k8s:/services': 'Service',
  })) }),
}));
vi.mock('../../shared/ResourceLinkChip', () => ({
  default: (props: { target: unknown; resourceName: string }) => {
    mocks.link(props);
    return <button>{props.resourceName}</button>;
  },
}));

import RelatedResourcesView, { groupRelated } from './RelatedResourcesView';

const node = (resourceKey: string, id: string, namespace = '') => ({
  pluginId: 'kubernetes',
  key: `host-key:${resourceKey}:${namespace}:${id}`,
  route: { connection: 'conn-1' },
  reference: {
    address: {
      provider: 'kubernetes', authority: 'cluster-1', type: resourceKey, id,
      scope: namespace ? [{ dimension: 'namespace', value: namespace }] : [],
    },
  },
});

const ctx = {
  data: { metadata: { name: 'web-1', namespace: 'default' } },
  // Table roots retain name identity and carry UID only as incarnation.
  resource: {
    reference: { ...node('k8s:/pods', 'web-1', 'default').reference, incarnation: '0f6c1e2a-uid' },
    route: { connection: 'conn-1' },
    pluginID: 'kubernetes',
  },
};

const podRelated = [
  {
    resource: node('k8s:/secrets', 'tls', 'default'),
    type: 'uses',
    direction: 'outgoing',
    label: 'uses',
  },
  {
    resource: node('k8s:/configmaps', 'app-config', 'default'),
    type: 'uses',
    direction: 'outgoing',
    label: 'uses',
  },
  {
    resource: node('k8s:/nodes', 'worker-1'),
    type: 'runs_on',
    direction: 'outgoing',
    label: 'runs on',
  },
  {
    resource: node('k8s:apps/replicasets', 'web-abc', 'default'),
    type: 'owns',
    direction: 'incoming',
    label: 'owned by',
  },
  {
    resource: node('k8s:/services', 'web', 'default'),
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
    const groups = groupRelated(podRelated as never, new Map(Object.entries({
      'k8s:/secrets': 'Secret', 'k8s:/configmaps': 'ConfigMap',
    })));

    expect(groups.map((g) => g.title)).toEqual(['Owned by', 'Runs on', 'Selected by', 'Uses']);
    expect(groups[3].items.map((i) => i.resource.reference.address.id)).toEqual(['app-config', 'tls']);
  });

  it('drops duplicate edges to the same resource', () => {
    const dup = [podRelated[0], { ...podRelated[0] }];
    expect(groupRelated(dup as never)[0].items).toHaveLength(1);
  });

  it('keeps distinct host keys even when visible addresses match', () => {
    const first = podRelated[0];
    const other = {
      ...first,
      resource: {
        ...first.resource,
        key: 'different-host-key',
        reference: {
          ...first.resource.reference,
          address: { ...first.resource.reference.address, authority: 'other-cluster' },
        },
      },
    };
    expect(groupRelated([first, other] as never)[0].items).toHaveLength(2);
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
      reference: ctx.resource.reference,
      route: ctx.resource.route,
    });
  });

  it('renders grouped sections and passes canonical targets to resource links', () => {
    mocks.useRelatedResources.mockReturnValue(hookResult({ related: podRelated }));
    render(<RelatedResourcesView ctx={ctx as never} />);

    expect(screen.getByText('Owned by (1)')).toBeInTheDocument();
    expect(screen.getByText('Uses (2)')).toBeInTheDocument();
    expect(screen.getByText('ReplicaSet')).toBeInTheDocument();

    expect(mocks.link).toHaveBeenCalledWith(expect.objectContaining({
      target: podRelated[2].resource,
      resourceName: 'worker-1',
    }));
  });

  it('prefixes resources in another namespace', () => {
    mocks.useRelatedResources.mockReturnValue(
      hookResult({
        related: [
          {
            resource: node('k8s:/secrets', 'shared', 'infra'),
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

