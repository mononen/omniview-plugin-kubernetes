import { describe, expect, it } from 'vitest';

import {
  NODE_WIDTH,
  kindFromKey,
  layoutGraph,
  nodeKey,
  truncateMiddle,
} from './resourceGraphLayout';

const node = (resourceKey: string, id: string, namespace = '') => ({
  pluginId: 'kubernetes',
  connectionId: 'c1',
  resourceKey,
  id,
  namespace,
});

const pod = node('core::v1::Pod', 'web-1', 'default');
const pod2 = node('core::v1::Pod', 'web-2', 'default');
const rs = node('apps::v1::ReplicaSet', 'web-abc', 'default');
const svc = node('core::v1::Service', 'web', 'default');
const worker = node('core::v1::Node', 'worker-1');

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
        target: node('core::v1::Pod', 'elsewhere', 'default'),
        type: 'selects',
        label: 'selects',
      },
    ],
    truncated: false,
  };

  it('puts each depth in its own column, upstream first', () => {
    const layout = layoutGraph(sg as never);
    const columnOf = Object.fromEntries(layout.nodes.map((n) => [n.node.id, n.column]));

    expect(columnOf).toEqual({ web: 0, 'web-abc': 1, 'web-1': 2, 'web-2': 2, 'worker-1': 3 });
    expect(layout.nodes.find((n) => n.isRoot)?.node.id).toBe('web-abc');
  });

  it('sorts a column by name and centres short columns', () => {
    const layout = layoutGraph(sg as never);
    const pods = layout.nodes.filter((n) => n.kind === 'Pod');
    const root = layout.nodes.find((n) => n.isRoot)!;

    expect(pods.map((p) => p.node.id)).toEqual(['web-1', 'web-2']);
    expect(pods[0].y).toBeLessThan(pods[1].y);
    // The single-node root column sits between the two pods.
    expect(root.y).toBeGreaterThan(pods[0].y);
    expect(root.y).toBeLessThan(pods[1].y);
  });

  it('keeps edges between laid-out nodes, drawn from right edge to left edge', () => {
    const layout = layoutGraph(sg as never);

    expect(layout.edges).toHaveLength(4);
    const own = layout.edges.find((e) => e.to.node.id === 'web-1')!;
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

  it('builds stable keys and kinds', () => {
    expect(nodeKey(worker)).toBe('kubernetes/c1/core::v1::Node//worker-1');
    expect(kindFromKey('apps::v1::ReplicaSet')).toBe('ReplicaSet');
  });
});

describe('truncateMiddle', () => {
  it('keeps the distinguishing suffix of generated names', () => {
    expect(truncateMiddle('calico-typha-668fd484d9-2sw5t', 24)).toBe('calico-typha…484d9-2sw5t');
    expect(truncateMiddle('short', 24)).toBe('short');
  });
});
