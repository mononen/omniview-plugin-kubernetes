import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PodContainersSection from './PodContainersSection';

const state = vi.hoisted(() => ({ startDebug: vi.fn(), execution: vi.fn(), container: vi.fn() }));
vi.mock('../../../shared/drawer/DrawerActionsBridge', () => ({ useDrawerActionExecution: (props: unknown) => {
  state.execution(props);
  return { dialogs: null, deps: { startDebug: state.startDebug } };
} }));
vi.mock('./ContainerSlice', () => ({ default: (props: unknown) => { state.container(props); return null; } }));
vi.mock('@omniviewdev/runtime', () => ({ parseAppError: (cause: unknown) => cause }));

describe('Pod inline debug failures', () => {
  it('shows structured detail and clears stale error before a successful retry', async () => {
    state.startDebug.mockRejectedValueOnce({ code: 'FORBIDDEN', title: 'Forbidden', detail: 'Admission denied toolbox' }).mockResolvedValueOnce(undefined);
    render(<PodContainersSection connectionID="cluster" resourceID="pod" obj={{
      metadata: { name: 'pod', namespace: 'ns', uid: 'uid' },
      spec: { containers: [{ name: 'app' }] },
      status: { phase: 'Running', containerStatuses: [{ name: 'app', image: 'app:1', imageID: 'image', ready: true, restartCount: 0, state: { running: {} } }] },
    }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Debug app' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Forbidden: Admission denied toolbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Debug app' }));
    expect(screen.queryByRole('alert')).toBeNull();
    await waitFor(() => expect(state.startDebug).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('preserves canonical pod context across every container group and native debug', async () => {
    state.startDebug.mockReset().mockResolvedValue(undefined);
    const resource = {
      pluginID: 'kubernetes',
      reference: {
        address: { provider: 'kubernetes', authority: 'cluster-authority', type: 'k8s:/pods', id: 'pod', scope: [{ dimension: 'namespace', value: 'ns' }] },
        incarnation: 'uid',
      },
      route: { connection: 'cluster' },
      representation: 'kubernetes-object',
      targetId: 'admitted-pod',
    };
    const pod = {
      metadata: { name: 'pod', namespace: 'ns', uid: 'uid' },
      spec: { containers: [{ name: 'app' }], initContainers: [{ name: 'init' }], ephemeralContainers: [{ name: 'debug', targetContainerName: 'app' }] },
      status: { phase: 'Running', containerStatuses: [{ name: 'app', image: 'app:1', imageID: 'image', ready: true, restartCount: 0, state: { running: {} } }] },
    };
    render(<PodContainersSection connectionID="cluster" resourceID="pod" resource={resource} obj={pod} />);
    expect(state.execution).toHaveBeenLastCalledWith({ connectionID: 'cluster', resourceKey: 'k8s:/pods' });
    for (const name of ['app', 'init', 'debug']) {
      expect(state.container).toHaveBeenCalledWith(expect.objectContaining({
        container: expect.objectContaining({ name }), resource, pod,
      }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Debug app' }));
    await waitFor(() => expect(state.startDebug).toHaveBeenCalledWith({
      connectionID: 'cluster', resourceID: 'pod', namespace: 'ns', podUID: 'uid',
      targetContainerName: 'app', resourceData: pod,
    }));
  });
});
