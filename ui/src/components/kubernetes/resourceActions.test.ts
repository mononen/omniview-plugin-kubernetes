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
  it.each(['k8s:/pods', 'k8s:/nodes'])('passes canonical observation and admitted target to exec for %s', async (type) => {
    const object = target(type);
    if (type === 'k8s:/nodes') object.data.metadata!.namespace = undefined;
    if (type === 'k8s:/nodes') object.resource.reference.address.scope = [];
    const handlers = deps();
    const action = resolveKubernetesActions(object, handlers).find((entry) => entry.title === (type === 'k8s:/pods' ? 'Exec' : 'Shell'))!;
    await executeKubernetesAction(object, handlers, action.id, action.items?.[0].id);
    expect(handlers.createExecSession).toHaveBeenCalledWith(expect.objectContaining({
      opts: expect.objectContaining({
        resource_data: object.resource.record!.record.body,
        reference: object.resource.reference, route: object.resource.route,
      }),
    }));
    expect(handlers.closeDrawer).toHaveBeenCalledOnce();
  });

  it('opens init and ephemeral logs without mounted handlers and keeps exact identity', async () => {
    const handlers = deps();
    const object = target();
    const logs = resolveKubernetesActions(object, handlers).find((action) => action.title === 'Logs')!;
    expect(logs.items?.map((item) => item.title)).toEqual(['All Containers', 'main', 'setup (init)', 'debug (ephemeral)']);
    await executeKubernetesAction(object, handlers, logs.id, logs.items![2].id);
    expect(handlers.createLogSession).toHaveBeenCalledWith(expect.objectContaining({
      connectionID: 'prod', resourceKey: 'k8s:/pods', resourceID: 'api',
      resourceData: object.resource.record!.record.body,
      reference: object.resource.reference, route: object.resource.route,
      target: 'setup', params: { filter_labels: 'container' },
    }));
    expect(vi.mocked(handlers.createLogSession).mock.calls[0][0].resourceData).toBe(object.resource.record!.record.body);
    expect(handlers.closeDrawer).toHaveBeenCalledOnce();
  });

  it.each([
    ['Deployment', 'k8s:apps/deployments'], ['DaemonSet', 'k8s:apps/daemonsets'],
    ['ReplicaSet', 'k8s:apps/replicasets'], ['StatefulSet', 'k8s:apps/statefulsets'],
    ['Job', 'k8s:batch/jobs'], ['CronJob', 'k8s:batch/cronjobs'],
  ])(
    'keeps all-container and named-container logs for %s', async (_kind, resourceType) => {
      const object = target(resourceType);
      const handlers = deps();
      const logs = resolveKubernetesActions(object, handlers).find((action) => action.title === 'Logs')!;
      expect(logs.items?.map((item) => item.title)).toEqual(['All Containers', 'main', 'sidecar']);
      await executeKubernetesAction(object, handlers, logs.id, logs.items![1].id);
      const input = vi.mocked(handlers.createLogSession).mock.calls[0][0];
      expect(input.resourceData).toBe(object.resource.record!.record.body);
      expect(input.reference).toBe(object.resource.reference);
      expect(input.route).toBe(object.resource.route);
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
