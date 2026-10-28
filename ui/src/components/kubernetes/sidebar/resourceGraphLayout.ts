import type { GraphEdge, GraphNode, Subgraph } from '@omniviewdev/runtime/models';
import type { DrawerContext } from '@omniviewdev/runtime';
import { ResourceClient } from '@omniviewdev/runtime/api';
import { useQuery } from '@tanstack/react-query';

/** Catalog labels are presentation metadata; resource types remain opaque. */
export function useGraphDisplayNames(ctx: DrawerContext) {
  return useQuery({
    queryKey: ['resource-graph-catalog', ctx.resource!.pluginID, ctx.resource!.route],
    queryFn: () => ResourceClient.Catalog(ctx.resource!.pluginID, { route: ctx.resource!.route }),
    select: (catalog) => new Map(catalog.types.map((type) => [type.type, type.displayName])),
  });
}

export const NODE_WIDTH = 184;
export const NODE_HEIGHT = 38;
const COLUMN_GAP = 72;
const ROW_GAP = 10;
const PADDING = 16;
/** How far a same-column edge bulges out to the right. */
const LOOP_BULGE = 48;

/** Kinds listed first in a column, roughly from controllers to infrastructure. */
const kindOrder = [
  'Deployment',
  'StatefulSet',
  'DaemonSet',
  'CronJob',
  'Job',
  'ReplicaSet',
  'HorizontalPodAutoscaler',
  'Pod',
  'Service',
  'Ingress',
  'NetworkPolicy',
  'PodDisruptionBudget',
  'ServiceAccount',
  'ConfigMap',
  'Secret',
  'PersistentVolumeClaim',
  'PersistentVolume',
  'StorageClass',
  'Node',
];

export type LayoutNode = {
  key: string;
  node: GraphNode;
  kind: string;
  depth: number;
  column: number;
  x: number;
  y: number;
  isRoot: boolean;
};

export type LayoutEdge = {
  key: string;
  edge: GraphEdge;
  from: LayoutNode;
  to: LayoutNode;
  /** SVG path data from the source node to the target node. */
  path: string;
};

export type GraphLayout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
};


export function graphKind(node: GraphNode, displayNames: ReadonlyMap<string, string>): string {
  return displayNames.get(node.reference.address.type) ?? 'Resource';
}

/**
 * Shortens text from the middle, keeping the end: generated names (Pods,
 * ReplicaSets) differ only in their suffix.
 */
export function truncateMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${text.slice(0, head)}…${text.slice(text.length - tail)}`;
}

function kindRank(kind: string): number {
  const i = kindOrder.indexOf(kind);
  return i === -1 ? kindOrder.length : i;
}

function edgePath(from: LayoutNode, to: LayoutNode): string {
  const fromMid = from.y + NODE_HEIGHT / 2;
  const toMid = to.y + NODE_HEIGHT / 2;

  if (to.column > from.column) {
    const sx = from.x + NODE_WIDTH;
    const ex = to.x;
    const c = (ex - sx) / 2;
    return `M ${sx} ${fromMid} C ${sx + c} ${fromMid}, ${ex - c} ${toMid}, ${ex} ${toMid}`;
  }
  if (to.column < from.column) {
    const sx = from.x;
    const ex = to.x + NODE_WIDTH;
    const c = (sx - ex) / 2;
    return `M ${sx} ${fromMid} C ${sx - c} ${fromMid}, ${ex + c} ${toMid}, ${ex} ${toMid}`;
  }
  // Same column: loop out to the right.
  const x = from.x + NODE_WIDTH;
  return `M ${x} ${fromMid} C ${x + LOOP_BULGE} ${fromMid}, ${x + LOOP_BULGE} ${toMid}, ${x} ${toMid}`;
}

/**
 * Lays a subgraph out left to right in columns by distance from the root
 * (upstream on the left, the root, then downstream). Each column is sorted by
 * kind, namespace and name, and centred vertically against the tallest one.
 */
export function layoutGraph(sg: Subgraph, displayNames: ReadonlyMap<string, string> = new Map()): GraphLayout {
  const rootKey = sg.root.key;
  const depths = [...new Set(sg.nodes.map((n) => n.depth))].sort((a, b) => a - b);
  const columnOf = new Map(depths.map((d, i) => [d, i]));

  const columns = depths.map((depth) =>
    sg.nodes
      .filter((n) => n.depth === depth)
      .map((n) => ({ ...n, kind: graphKind(n.node, displayNames) }))
      .sort(
        (a, b) =>
          kindRank(a.kind) - kindRank(b.kind) ||
          a.kind.localeCompare(b.kind) ||
          (a.node.reference.address.scope.find((entry) => entry.dimension === 'namespace')?.value ?? '')
            .localeCompare(b.node.reference.address.scope.find((entry) => entry.dimension === 'namespace')?.value ?? '') ||
          a.node.reference.address.id.localeCompare(b.node.reference.address.id),
      ),
  );

  const columnHeight = (rows: number) => rows * NODE_HEIGHT + Math.max(rows - 1, 0) * ROW_GAP;
  const tallest = Math.max(0, ...columns.map((c) => columnHeight(c.length)));

  const nodes: LayoutNode[] = [];
  const byKey = new Map<string, LayoutNode>();
  columns.forEach((column, ci) => {
    const top = PADDING + (tallest - columnHeight(column.length)) / 2;
    column.forEach((n, row) => {
      const key = n.node.key;
      const laid: LayoutNode = {
        key,
        node: n.node,
        kind: n.kind,
        depth: n.depth,
        column: columnOf.get(n.depth) ?? ci,
        x: PADDING + ci * (NODE_WIDTH + COLUMN_GAP),
        y: top + row * (NODE_HEIGHT + ROW_GAP),
        isRoot: key === rootKey,
      };
      nodes.push(laid);
      byKey.set(key, laid);
    });
  });

  const edges: LayoutEdge[] = [];
  for (const edge of sg.edges) {
    const from = byKey.get(edge.source.key);
    const to = byKey.get(edge.target.key);
    if (!from || !to) continue;
    edges.push({
      key: `${from.key}->${to.key}:${edge.type}:${edge.label}`,
      edge,
      from,
      to,
      path: edgePath(from, to),
    });
  }

  const hasLoops = edges.some((e) => e.from.column === e.to.column);
  return {
    nodes,
    edges,
    width:
      PADDING * 2 +
      depths.length * NODE_WIDTH +
      Math.max(depths.length - 1, 0) * COLUMN_GAP +
      (hasLoops ? LOOP_BULGE : 0),
    height: PADDING * 2 + tallest,
  };
}
