import type {
  DrawerContext,
  useConfirmationModal,
  useExec,
  useExecuteAction,
  useLogs,
  useResourceMutations,
  useStreamAction,
} from '@omniviewdev/runtime';

/**
 * Drawer actions are plain objects (`DrawerComponentAction`), but what they do
 * needs React hooks: the confirmation modal, mutations, log and exec sessions.
 * A drawer opened from a table row could close over the table's hooks; a drawer
 * opened from a link (owner chip, Related view, graph) is built by a plain
 * factory and could not, so it had no actions.
 *
 * Instead, `DrawerActionsBridge` calls the hooks and registers the results here,
 * keyed by connection and resource type. It is mounted in every drawer view and
 * in every resource table, so whichever way an action is triggered, the handlers
 * for its resource are mounted. Actions look them up with `drawerActionDeps(ctx)`.
 */

export type ScaleTarget = { name: string; namespace: string; replicas: number };

type NodeShellConfig = { image?: string; command?: string };

export type DrawerActionDeps = {
  show: ReturnType<typeof useConfirmationModal>['show'];
  remove: ReturnType<typeof useResourceMutations>['remove'];
  update: ReturnType<typeof useResourceMutations>['update'];
  createLogSession: ReturnType<typeof useLogs>['createLogSession'];
  createExecSession: ReturnType<typeof useExec>['createSession'];
  executeAction: ReturnType<typeof useExecuteAction>['executeAction'];
  startStreamAction: ReturnType<typeof useStreamAction>['startStreamAction'];
  closeDrawer: () => void;
  /** Opens the replica count dialog; confirming runs the `scale` action. */
  openScale: (target: ScaleTarget) => void;
  nodeShellConfig?: NodeShellConfig;
};

const registry = new Map<string, DrawerActionDeps[]>();

export const registryKey = (connectionID: string, resourceKey: string) => `${connectionID}\u0000${resourceKey}`;

export function registerDrawerActionDeps(key: string, deps: DrawerActionDeps): () => void {
  const list = registry.get(key) ?? [];
  list.push(deps);
  registry.set(key, list);
  return () => {
    const current = registry.get(key);
    if (!current) return;
    const idx = current.lastIndexOf(deps);
    if (idx !== -1) current.splice(idx, 1);
    if (current.length === 0) registry.delete(key);
  };
}

/** The hook-backed handlers for the resource in `ctx`. Call it inside an action handler. */
export function drawerActionDeps(ctx: DrawerContext): DrawerActionDeps {
  const connectionID = ctx.resource?.connectionID ?? '';
  const resourceKey = ctx.resource?.key ?? '';
  const list = registry.get(registryKey(connectionID, resourceKey));
  const deps = list?.[list.length - 1];
  if (!deps) {
    throw new Error(`No drawer action handlers are mounted for ${resourceKey} on connection ${connectionID}`);
  }
  return deps;
}
