import { describe, expect, it, vi } from 'vitest';

import {
  NODE_WIDTH,
  graphKind,
  layoutGraph,
  truncateMiddle,
} from './resourceGraphLayout';

const displayNames = new Map(Object.entries({
  'k8s:/pods': 'Pod', 'k8s:apps/replicasets': 'ReplicaSet',
  'k8s:/services': 'Service', 'k8s:/nodes': 'Node',
}));

vi.mock('@omniviewdev/runtime/api', () => ({ ResourceClient: {} }));

const node = (resourceKey: string, id: string, namespace = '') => ({
  pluginId: 'kubernetes',
  key: `host-key:${resourceKey}:${namespace}:${id}`,
  route: { connection: 'c1' },
  reference: {
    address: {
      provider: 'kubernetes', authority: 'cluster-1', type: resourceKey,
      id, scope: namespace ? [{ dimension: 'namespace', value: namespace }] : [],
    },
  },
});

const pod = node('k8s:/pods', 'web-1', 'default');
const pod2 = node('k8s:/pods', 'web-2', 'default');
const rs = node('k8s:apps/replicasets', 'web-abc', 'default');
const svc = node('k8s:/services', 'web', 'default');
const worker = node('k8s:/nodes', 'worker-1');

describe('layoutGraph', () => {
  const sg = {
    root: rs,
    nodes: [
      { node: rs, depth: 0 },
      { node: pod2, depth: 1 },
      { node: pod, depth: 1 },
      { node: worker, depth: 2 },
      { node: svc, depth: -1 },
    ],
    edges: [
      { source: rs, target: pod, type: 'owns', label: 'owned by' },
      { source: rs, target: pod2, type: 'owns', label: 'owned by' },
      { source: pod, target: worker, type: 'runs_on', label: 'runs on' },
      { source: pod2, target: worker, type: 'runs_on', label: 'runs on' },
      // Not part of the subgraph's nodes: dropped.
      {
        source: svc,
        target: node('k8s:/pods', 'elsewhere', 'default'),
        type: 'selects',
        label: 'selects',
      },
    ],
    truncated: false,
  };

  it('puts each depth in its own column, upstream first', () => {
    const layout = layoutGraph(sg as never, displayNames);
    const columnOf = Object.fromEntries(layout.nodes.map((n) => [n.node.reference.address.id, n.column]));

    expect(columnOf).toEqual({ web: 0, 'web-abc': 1, 'web-1': 2, 'web-2': 2, 'worker-1': 3 });
    expect(layout.nodes.find((n) => n.isRoot)?.node.reference.address.id).toBe('web-abc');
  });

  it('sorts a column by name and centres short columns', () => {
    const layout = layoutGraph(sg as never, displayNames);
    const pods = layout.nodes.filter((n) => n.kind === 'Pod');
    const root = layout.nodes.find((n) => n.isRoot)!;

    expect(pods.map((p) => p.node.reference.address.id)).toEqual(['web-1', 'web-2']);
    expect(pods[0].y).toBeLessThan(pods[1].y);
    // The single-node root column sits between the two pods.
    expect(root.y).toBeGreaterThan(pods[0].y);
    expect(root.y).toBeLessThan(pods[1].y);
  });

  it('keeps edges between laid-out nodes, drawn from right edge to left edge', () => {
    const layout = layoutGraph(sg as never, displayNames);

    expect(layout.edges).toHaveLength(4);
    const own = layout.edges.find((e) => e.to.node.reference.address.id === 'web-1')!;
    expect(own.path.startsWith(`M ${own.from.x + NODE_WIDTH} `)).toBe(true);
    expect(own.path.endsWith(`${own.to.x} ${own.to.y + 19}`)).toBe(true);
  });

  it('draws backward edges from the left side and sizes the canvas', () => {
    const back = layoutGraph({
      root: rs,
      nodes: [
        { node: rs, depth: 0 },
        { node: pod, depth: 1 },
      ],
      edges: [{ source: pod, target: rs, type: 'uses', label: '' }],
      truncated: false,
    } as never);

    const [e] = back.edges;
    expect(e.path.startsWith(`M ${e.from.x} `)).toBe(true);
    expect(back.width).toBeGreaterThan(2 * NODE_WIDTH);
  });

  it('preserves host-issued keys and Kubernetes display kinds', () => {
    const layout = layoutGraph(sg as never, displayNames);
    expect(new Set(layout.nodes.map((entry) => entry.key)).size).toBe(layout.nodes.length);
    expect(layout.nodes.find((entry) => entry.node === worker)?.key).toBe(worker.key);
    expect(graphKind(rs, displayNames)).toBe('ReplicaSet');
    expect(graphKind(node('k8s:example.io/strange-plurals', 'x'), displayNames)).toBe('Resource');
  });
});

describe('truncateMiddle', () => {
  it('keeps the distinguishing suffix of generated names', () => {
    expect(truncateMiddle('calico-typha-668fd484d9-2sw5t', 24)).toBe('calico-typha…484d9-2sw5t');
    expect(truncateMiddle('short', 24)).toBe('short');
  });
});
