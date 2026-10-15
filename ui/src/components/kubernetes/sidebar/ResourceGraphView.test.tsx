/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useResourceGraph: vi.fn(),
  showResourceSidebar: vi.fn(),
}));

vi.mock('@omniviewdev/runtime', () => ({
  useResourceGraph: (...args: unknown[]) => mocks.useResourceGraph(...args),
  relationshipLabel: (type: string) => ({ owns: 'Owns', runs_on: 'Runs on' })[type] ?? type,
  useRightDrawer: () => ({ showResourceSidebar: mocks.showResourceSidebar }),
}));

import ResourceGraphView from './ResourceGraphView';

const node = (resourceKey: string, id: string, namespace = '') => ({
  pluginId: 'kubernetes',
  connectionId: 'conn-1',
  resourceKey,
  id,
  namespace,
});

const rs = node('apps::v1::ReplicaSet', 'web-abc', 'default');
const pod = node('core::v1::Pod', 'web-abc-1', 'default');
const worker = node('core::v1::Node', 'worker-1');

const ctx = {
  data: { metadata: { name: 'web-abc', namespace: 'default' } },
  resource: {
    id: 'uid-123',
    key: 'apps::v1::ReplicaSet',
    connectionID: 'conn-1',
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
  });

  it('queries the graph by name, not by UID', () => {
    mocks.useResourceGraph.mockReturnValue(hookResult());
    render(<ResourceGraphView ctx={ctx as never} />);

    expect(mocks.useResourceGraph).toHaveBeenCalledWith({
      pluginID: 'kubernetes',
      connectionID: 'conn-1',
      resourceKey: 'apps::v1::ReplicaSet',
      resourceID: 'web-abc',
      namespace: 'default',
    });
  });

  it('draws nodes, a legend, and opens a resource on click', () => {
    mocks.useResourceGraph.mockReturnValue(hookResult({ graph }));
    const { container } = render(<ResourceGraphView ctx={ctx as never} />);

    expect(container.querySelectorAll('path[marker-end]')).toHaveLength(2);
    expect(screen.getByText('Owns')).toBeInTheDocument();
    expect(screen.getByText('Runs on')).toBeInTheDocument();
    expect(screen.getByText('3 resources')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Node worker-1' }));
    expect(mocks.showResourceSidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceKey: 'core::v1::Node',
        resourceID: 'worker-1',
        connectionID: 'conn-1',
      }),
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Pod default/web-abc-1' }), {
      key: 'Enter',
    });
    expect(mocks.showResourceSidebar).toHaveBeenLastCalledWith(
      expect.objectContaining({ resourceID: 'web-abc-1', namespace: 'default' }),
    );
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

describe('ResourceGraphView on a host without the subgraph hook', () => {
  it('asks for a newer Omniview instead of crashing', async () => {
    vi.resetModules();
    // SystemJS resolves exports the host lacks to undefined.
    vi.doMock('@omniviewdev/runtime', () => ({
      useResourceGraph: undefined,
      relationshipLabel: undefined,
      useRightDrawer: () => ({ showResourceSidebar: vi.fn() }),
    }));
    const { default: View } = await import('./ResourceGraphView');

    render(<View ctx={ctx as never} />);
    expect(screen.getByText('Update Omniview to see the resource graph')).toBeInTheDocument();
    vi.doUnmock('@omniviewdev/runtime');
  });
});
