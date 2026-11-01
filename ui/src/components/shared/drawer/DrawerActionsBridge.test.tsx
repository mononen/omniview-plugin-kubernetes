import React from 'react';
import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useDrawerActionExecution } from './DrawerActionsBridge';

const mocks = vi.hoisted(() => ({
  show: vi.fn(), mutate: vi.fn(), createLogSession: vi.fn(), createSession: vi.fn(),
  executeAction: vi.fn(), startStreamAction: vi.fn(), closeDrawer: vi.fn(),
  debug: { startDebug: vi.fn(), openDebugOptions: vi.fn(), dialogs: null, isReady: true, isBusy: false },
}));
vi.mock('@omniviewdev/runtime', () => ({
  useConfirmationModal: () => ({ show: mocks.show }),
  useResourceMutations: () => ({ mutate: mocks.mutate }),
  useLogs: () => ({ createLogSession: mocks.createLogSession }),
  useExec: () => ({ createSession: mocks.createSession }),
  useExecuteAction: () => ({ executeAction: mocks.executeAction, isExecuting: false }),
  useStreamAction: () => ({ startStreamAction: mocks.startStreamAction }),
  useRightDrawer: () => ({ closeDrawer: mocks.closeDrawer }),
  jsonToValue: (value: unknown) => value,
}));
vi.mock('../../../features/debug/useDebugActions', () => ({ useDebugActions: () => mocks.debug }));
vi.mock('../../../hooks/useClusterPreferences', () => ({ useClusterPreferences: () => ({ connectionOverrides: {} }) }));
vi.mock('../../kubernetes/actions/ScaleModal', () => ({ default: () => null }));

it('retains canonical mutation handlers and refreshes changed debug callbacks', () => {
  const { result, rerender } = renderHook(() => useDrawerActionExecution({ connectionID: 'cluster', resourceKey: 'k8s:/pods' }));
  expect(result.current.deps.mutate).toBe(mocks.mutate);
  expect(result.current.deps.startDebug).toBe(mocks.debug.startDebug);
  const previous = result.current.deps;
  mocks.debug = { ...mocks.debug, startDebug: vi.fn(), openDebugOptions: vi.fn() };
  rerender();
  expect(result.current.deps).not.toBe(previous);
  expect(result.current.deps.startDebug).toBe(mocks.debug.startDebug);
  expect(result.current.deps.openDebugOptions).toBe(mocks.debug.openDebugOptions);
  expect(result.current.deps.mutate).toBe(mocks.mutate);
  expect(React.isValidElement(result.current.dialogs)).toBe(true);
});
