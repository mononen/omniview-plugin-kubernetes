import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonToValue, type SearchExecutionContextV1, type SearchProviderItemV1, type SearchScopeV1 } from '@omniviewdev/runtime';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  hook: vi.fn(),
  deps: { createLogSession: vi.fn().mockResolvedValue({ id: 'session' }), closeDrawer: vi.fn() },
}));
vi.mock('@omniviewdev/runtime/api', () => ({ ResourceClient: { Get: mocks.get } }));
vi.mock('../shared/drawer/DrawerActionsBridge', () => ({
  useDrawerActionExecution: () => { mocks.hook(); return { deps: mocks.deps, dialogs: null, isBusy: false }; },
}));

import KubernetesSearchActionContext, { executeSearchAction, searchActions, validateSearchAction } from './KubernetesSearchActionContext';

const scope: Extract<SearchScopeV1, { kind: 'resource' }> = {
  kind: 'resource', pluginId: 'kubernetes', route: { connection: 'prod' }, targetId: 'host-target', representation: 'native',
  reference: { address: { provider: 'kubernetes', authority: 'host-authority', type: 'k8s:/pods', id: 'api', scope: [{dimension:'namespace',value:'apps'}] }, incarnation:'original' }, label: 'api',
};
const data = {
  metadata: { name: 'api', namespace: 'apps', uid: 'original' },
  spec: { containers: [{ name: 'main' }] },
};
const context = (): SearchExecutionContextV1 => ({ signal: new AbortController().signal, generation: 1, openResource: vi.fn(), navigate: vi.fn() });
const envelope = (body: unknown) => ({ targetId: scope.targetId, route: scope.route, key:'host-key', addressKey:'host-address', record: { reference: scope.reference, body: jsonToValue(body), representation: {id:scope.representation} } });

beforeEach(() => {
  mocks.get.mockReset().mockResolvedValue(envelope(data));
  mocks.hook.mockClear();
  mocks.deps.createLogSession.mockClear();
  mocks.deps.closeDrawer.mockClear();
});
afterEach(cleanup);

describe('global Kubernetes action context', () => {
  it('discovers and dispatches logs without a mounted table or plugin page', async () => {
    render(<KubernetesSearchActionContext />);
    const items: SearchProviderItemV1[] = await searchActions(scope, context().signal);
    await searchActions(scope, context().signal);
    expect(mocks.hook).not.toHaveBeenCalled();
    const logs = items.find((item) => item.label === 'Logs: main')!;
    expect(logs).toBeDefined();
    expect(mocks.get).toHaveBeenCalledWith('kubernetes', { targetId: scope.targetId, request: { reference: scope.reference, route: scope.route, representation: scope.representation } });
    if (logs.value.kind !== 'action') throw new Error('Expected action');
    mocks.get.mockClear();
    const execution = executeSearchAction(logs.value.action, context());
    await act(async () => { await Promise.resolve(); });
    await execution;
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.deps.createLogSession).toHaveBeenCalledWith(expect.objectContaining({ target: 'main', resourceData: data }));
    mocks.deps.closeDrawer.mockClear();
    mocks.deps.createLogSession.mockRejectedValueOnce(new Error('Failed to create log session'));
    await expect(executeSearchAction(logs.value.action, context())).rejects.toThrow('Failed to create log session');
    expect(mocks.deps.closeDrawer).not.toHaveBeenCalled();
  });

  it('rejects changed UID before execution', async () => {
    render(<KubernetesSearchActionContext />);
    mocks.get.mockResolvedValue(envelope({ ...data, metadata: { ...data.metadata, uid: 'replacement' } }));
    await expect(searchActions(scope, context().signal)).rejects.toThrow(/identity/);
    expect(mocks.deps.createLogSession).not.toHaveBeenCalled();
  });

  it('keeps native read failures distinct from no actions', async () => {
    render(<KubernetesSearchActionContext />);
    mocks.get.mockRejectedValue(new Error('Forbidden'));
    await expect(searchActions(scope, context().signal)).rejects.toThrow('Forbidden');
  });

  it('discovers cached descriptors without reads but bypasses cached data at execution', async () => {
    render(<KubernetesSearchActionContext />);
    const items = await searchActions(scope, context().signal, data);
    await searchActions(scope, context().signal, data);
    const logs = items.find(item => item.label === 'Logs: main')!;
    if (logs.value.kind !== 'action') throw new Error('Expected action');
    expect(mocks.get).not.toHaveBeenCalled();
    expect(await validateSearchAction(logs.value.action, context())).toBe(true);
    expect(await validateSearchAction({ id: 'missing', target: scope }, context())).toBe(false);
    expect(mocks.get).not.toHaveBeenCalled();
    mocks.get.mockResolvedValue(envelope({ ...data, metadata: { ...data.metadata, uid: 'replacement' } }));
    await expect(executeSearchAction(logs.value.action, context())).rejects.toThrow(/identity/);
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.deps.createLogSession).not.toHaveBeenCalled();
  });

  it('rejects removed context and cancelled requests without reads', async () => {
    const mounted = render(<KubernetesSearchActionContext />);
    mounted.unmount();
    await expect(searchActions(scope, context().signal)).rejects.toThrow(/unavailable/);
    render(<KubernetesSearchActionContext />);
    const controller = new AbortController();
    controller.abort();
    await expect(searchActions(scope, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('rejects host target and canonical address mismatches before dispatch', async () => {
    render(<KubernetesSearchActionContext />);
    mocks.get.mockResolvedValue({ ...envelope(data), targetId: 'another-target' });
    await expect(searchActions(scope, context().signal)).rejects.toThrow(/identity/);
    const value = envelope(data);
    mocks.get.mockResolvedValue({ ...value, record: { ...value.record, reference: {
      ...scope.reference, address: { ...scope.reference.address, authority: 'another-authority' },
    } } });
    await expect(searchActions(scope, context().signal)).rejects.toThrow(/identity/);
    expect(mocks.deps.createLogSession).not.toHaveBeenCalled();
  });

  it('cancels an in-flight Get and fences its late result', async () => {
    render(<KubernetesSearchActionContext />);
    const { promise, resolve } = Promise.withResolvers<unknown>();
    const cancel = vi.fn();
    mocks.get.mockReturnValue(Object.assign(promise, { cancel }));
    const controller = new AbortController();
    const pending = searchActions(scope, controller.signal);
    controller.abort();
    resolve(envelope(data));
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancel).toHaveBeenCalledOnce();
    expect(mocks.deps.createLogSession).not.toHaveBeenCalled();
  });

  it('allows absent incarnation while retaining native name and namespace comparison', async () => {
    render(<KubernetesSearchActionContext />);
    const unpinned = { ...scope, reference: { address: scope.reference.address } };
    await expect(searchActions(unpinned, context().signal)).resolves.toBeDefined();
    mocks.get.mockResolvedValue(envelope({ ...data, metadata: { ...data.metadata, namespace: 'other' } }));
    await expect(searchActions(unpinned, context().signal)).rejects.toThrow(/identity/);
  });
});
