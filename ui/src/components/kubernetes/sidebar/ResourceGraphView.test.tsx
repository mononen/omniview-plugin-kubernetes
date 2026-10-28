/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useResourceGraph: vi.fn(),
  showResourceSidebar: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock('@omniviewdev/runtime', () => ({
  useResourceGraph: (...args: unknown[]) => mocks.useResourceGraph(...args),
  relationshipLabel: (type: string) => ({ owns: 'Owns', runs_on: 'Runs on' })[type] ?? type,
  useRightDrawer: () => ({ showResourceSidebar: mocks.showResourceSidebar }),
}));

vi.mock('@omniviewdev/runtime/api', () => ({ ResourceClient: { ResolveReference: mocks.resolve } }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: new Map(Object.entries({
    'k8s:apps/replicasets': 'ReplicaSet', 'k8s:/pods': 'Pod', 'k8s:/nodes': 'Node',
  })) }),
}));

import ResourceGraphView from './ResourceGraphView';

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

const rs = node('k8s:apps/replicasets', 'web-abc', 'default');
const pod = node('k8s:/pods', 'web-abc-1', 'default');
const worker = node('k8s:/nodes', 'worker-1');

const ctx = {
  data: { metadata: { name: 'web-abc', namespace: 'default' } },
  resource: {
    reference: { ...rs.reference, incarnation: 'uid-123' },
    route: rs.route,
    representation: 'kubernetes-object',
    pluginID: 'kubernetes',
  },
};

const graph = {
  root: rs,
  nodes: [
    { node: rs, depth: 0 },
    { node: pod, depth: 1 },
    { node: worker, depth: 2 },
  ],
  edges: [
    { source: rs, target: pod, type: 'owns', label: 'owned by' },
    { source: pod, target: worker, type: 'runs_on', label: 'runs on' },
  ],
  truncated: false,
};

function hookResult(overrides: Record<string, unknown> = {}) {
  return {
    graph: null,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('ResourceGraphView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolve.mockImplementation(async (_plugin, request) => ({
      reference: { address: { ...request, authority: 'must-not-replace-observed-authority' } },
      route: { connection: 'must-not-replace-observed-route' },
      representation: 'kubernetes-object', targetId: 'host-target',
    }));
  });

  it('queries by canonical reference with UID only as incarnation', () => {
    mocks.useResourceGraph.mockReturnValue(hookResult());
    render(<ResourceGraphView ctx={ctx as never} />);

    expect(mocks.useResourceGraph).toHaveBeenCalledWith({
      pluginID: 'kubernetes',
      reference: ctx.resource.reference,
      route: ctx.resource.route,
    });
  });

  it('draws nodes, a legend, and opens a resource on click', async () => {
    mocks.useResourceGraph.mockReturnValue(hookResult({ graph }));
    const { container } = render(<ResourceGraphView ctx={ctx as never} />);

    expect(container.querySelectorAll('path[marker-end]')).toHaveLength(2);
    expect(screen.getByText('Owns')).toBeInTheDocument();
    expect(screen.getByText('Runs on')).toBeInTheDocument();
    expect(screen.getByText('3 resources')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Node worker-1' }));
    await waitFor(() => expect(mocks.showResourceSidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: worker.reference,
        route: worker.route,
        targetId: 'host-target',
        representation: 'kubernetes-object',
      }),
    ));
    expect(mocks.resolve).toHaveBeenCalledWith('kubernetes', {
      route: worker.route, type: 'k8s:/nodes', scope: worker.reference.address.scope,
      id: 'worker-1', incarnation: undefined,
    });

    fireEvent.keyDown(screen.getByRole('button', { name: 'Pod default/web-abc-1' }), {
      key: 'Enter',
    });
    await waitFor(() => expect(mocks.showResourceSidebar).toHaveBeenLastCalledWith(
      expect.objectContaining({ reference: pod.reference, route: pod.route }),
    ));
  });

  it('does not make the root clickable', () => {
    mocks.useResourceGraph.mockReturnValue(hookResult({ graph }));
    render(<ResourceGraphView ctx={ctx as never} />);

    expect(screen.queryByRole('button', { name: 'ReplicaSet default/web-abc' })).toBeNull();
  });

  it('says when the result was truncated', () => {
    mocks.useResourceGraph.mockReturnValue(hookResult({ graph: { ...graph, truncated: true } }));
    render(<ResourceGraphView ctx={ctx as never} />);

    expect(screen.getByText('3 resources (limit reached, some left out)')).toBeInTheDocument();
  });

  it('shows empty and error states', () => {
    mocks.useResourceGraph.mockReturnValue(
      hookResult({ graph: { ...graph, nodes: [graph.nodes[0]], edges: [] } }),
    );
    const { unmount } = render(<ResourceGraphView ctx={ctx as never} />);
    expect(screen.getByText('No relationships to draw')).toBeInTheDocument();
    unmount();

    mocks.useResourceGraph.mockReturnValue(hookResult({ error: new Error('boom') }));
    render(<ResourceGraphView ctx={ctx as never} />);
    expect(screen.getByText('Could not load the resource graph')).toBeInTheDocument();
  });
});

it('shows guard failures without opening a fake resource', async () => {
  mocks.useResourceGraph.mockReturnValue(hookResult({ graph }));
  mocks.resolve.mockRejectedValueOnce(new Error('target membership expired'));
  mocks.showResourceSidebar.mockClear();
  render(<ResourceGraphView ctx={ctx as never} />);
  fireEvent.click(screen.getByRole('button', { name: 'Node worker-1' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('target membership expired');
  expect(mocks.showResourceSidebar).not.toHaveBeenCalled();
});

