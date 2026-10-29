import { jsonToValue } from '@omniviewdev/runtime';
import { describe, expect, it, vi } from 'vitest';
import type { DrawerActionDeps } from '../shared/drawer/actionDeps';
import { executeKubernetesAction, resolveKubernetesActions, type KubernetesActionTarget } from './resourceActions';

const target = (resourceKey = 'k8s:/pods'): KubernetesActionTarget => {
  const result: KubernetesActionTarget = {
  pluginID: 'kubernetes',
  resource: {
    pluginID: 'kubernetes', route: { connection: 'prod' },
    reference: {
      address: { provider: 'kubernetes', authority: 'test-cluster', type: resourceKey, id: 'api', scope: [{ dimension: 'namespace', value: 'apps' }] },
      incarnation: 'uid-1',
    },
    representation: 'native-json-test', targetId: 'action-membership',
  },
  data: {
    metadata: { name: 'api', namespace: 'apps', uid: 'uid-1' },
    spec: {
      containers: [{ name: 'main' }], initContainers: [{ name: 'setup' }],
      ephemeralContainers: [{ name: 'debug' }],
      template: { spec: { containers: [{ name: 'main' }, { name: 'sidecar' }] } },
      jobTemplate: { spec: { template: { spec: { containers: [{ name: 'main' }, { name: 'sidecar' }] } } } },
    },
  },
  };
  result.resource.record = {
    key: 'host-key', addressKey: 'host-address', targetId: result.resource.targetId!,
    route: result.resource.route,
    record: {
      reference: result.resource.reference,
      representation: { id: result.resource.representation!, revision: '1', schema: { state: 'none', validation: 'none', unvalidated: [] } },
      coverage: { kind: 'complete', paths: [], reason: '' },
      body: jsonToValue({ ...result.data, wide: 9007199254740993n }),
    },
  };
  return result;
};
const deps = () => ({
  createLogSession: vi.fn().mockResolvedValue({ id: 'session' }),
  createExecSession: vi.fn().mockResolvedValue({ id: 'exec-session' }),
  closeDrawer: vi.fn(), show: vi.fn(),
} as unknown as DrawerActionDeps);

describe('standalone Kubernetes actions', () => {
  it('offers init and ephemeral log container choices without mounted handlers', () => {
    const handlers = deps();
    const object = target();
    const logs = resolveKubernetesActions(object, handlers).find((action) => action.title === 'Logs')!;
    expect(logs.items?.map((item) => item.title)).toEqual(['All Containers', 'main', 'setup (init)', 'debug (ephemeral)']);
  });

  it.each([
    ['Deployment', 'k8s:apps/deployments'], ['DaemonSet', 'k8s:apps/daemonsets'],
    ['ReplicaSet', 'k8s:apps/replicasets'], ['StatefulSet', 'k8s:apps/statefulsets'],
    ['Job', 'k8s:batch/jobs'], ['CronJob', 'k8s:batch/cronjobs'],
  ])(
    'keeps all-container and named-container choices for %s', (_kind, resourceType) => {
      const object = target(resourceType);
      const handlers = deps();
      const logs = resolveKubernetesActions(object, handlers).find((action) => action.title === 'Logs')!;
      expect(logs.items?.map((item) => item.title)).toEqual(['All Containers', 'main', 'sidecar']);
    },
  );

  it('requires explicit container selection and rejects stale choices', () => {
    const handlers = deps();
    const object = target();
    const logs = resolveKubernetesActions(object, handlers).find((action) => action.title === 'Logs')!;
    expect(() => executeKubernetesAction(object, handlers, logs.id)).toThrow(/Choose/);
    expect(() => executeKubernetesAction(object, handlers, logs.id, 'missing')).toThrow(/Choose/);
    expect(handlers.createLogSession).not.toHaveBeenCalled();
  });

  it('rejects stale UID, namespace mismatch, and unavailable actions', () => {
    const object = target();
    expect(() => resolveKubernetesActions({
      ...object, resource: { ...object.resource, reference: { ...object.resource.reference, incarnation: 'deleted' } },
    }, deps())).toThrow(/identity/);
    expect(() => resolveKubernetesActions({
      ...object, data: { ...object.data, metadata: { ...object.data.metadata, namespace: 'other' } },
    }, deps())).toThrow(/identity/);
    expect(() => executeKubernetesAction(object, deps(), 'missing')).toThrow(/no longer available/);
    expect(resolveKubernetesActions(object, deps()).some((action) => action.title === 'Resize')).toBe(false);
  });

  it('dispatches the node drawer drain with canonical pod-default grace', async () => {
    const handlers = { ...deps(), executeAction: vi.fn().mockResolvedValue({}) };
    const object = target('k8s:/nodes');
    object.resource.reference.address.scope = [];
    object.data.metadata!.namespace = undefined;
    const drain = resolveKubernetesActions(object, handlers).find((entry) => entry.title === 'Drain')!;
    executeKubernetesAction(object, handlers, drain.id);
    expect(handlers.executeAction).not.toHaveBeenCalled();
    const confirmation = vi.mocked(handlers.show).mock.calls[0][0] as { onConfirm: () => Promise<void> };
    await confirmation.onConfirm();
    expect(handlers.executeAction).toHaveBeenCalledTimes(1);
    expect(handlers.executeAction).toHaveBeenCalledWith({
      route: object.resource.route,
      reference: object.resource.reference,
      action: 'drain',
      input: {
        kind: 'map',
        value: {
          gracePeriodSeconds: { kind: 'int64', value: '-1' },
          ignoreDaemonSets: { kind: 'bool', value: true },
          deleteEmptyDirData: { kind: 'bool', value: true },
          force: { kind: 'bool', value: false },
        },
      },
    });
  });

  it('preserves confirmation and propagates rejected delete without closing drawer', async () => {
    const handlers = { ...deps(), mutate: vi.fn().mockRejectedValue(new Error('Forbidden')) };
    const object = target();
    const action = resolveKubernetesActions(object, handlers).find((entry) => entry.title === 'Delete')!;
    executeKubernetesAction(object, handlers, action.id);
    expect(handlers.mutate).not.toHaveBeenCalled();
    const confirmation = vi.mocked(handlers.show).mock.calls[0][0] as { onConfirm: () => Promise<void> };
    await expect(confirmation.onConfirm()).rejects.toThrow('Forbidden');
    expect(handlers.closeDrawer).not.toHaveBeenCalled();
  });
});
