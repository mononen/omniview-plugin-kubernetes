import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InstallChartDialog from './InstallChartDialog';

const mocks = vi.hoisted(() => ({ execute: vi.fn(), target: vi.fn(), reference: vi.fn() }));
vi.mock('@omniviewdev/runtime', () => ({
  useExecuteAction: () => ({ executeAction: mocks.execute, isExecuting: false }),
  jsonToValue: (value: unknown) => value,
  valueToJSON: (value: unknown) => value,
}));
vi.mock('@omniviewdev/runtime/api', () => ({ ResourceClient: { ResolveTarget: mocks.target, ResolveReference: mocks.reference } }));
vi.mock('@omniviewdev/base-ui', () => {
  const Container = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return {
    Dialog: Object.assign(({ children, open }: React.PropsWithChildren<{ open: boolean }>) => open ? <div>{children}</div> : null, { Title: Container, Body: Container, Footer: Container, Close: () => null }),
    Stack: Container, Text: Container,
    Button: ({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => <button onClick={onClick} disabled={disabled}>{children}</button>,
    Input: { Control: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> },
  };
});
vi.mock('../../connections/SimpleSelect', () => ({ default: () => null }));
vi.mock('../../shared/NamespaceSelect', () => ({ default: () => null }));
vi.mock('../../shared/CodeEditor', () => ({ default: ({ value }: { value: string }) => <pre>{value}</pre> }));

const target = { provider: 'helm', authority: 'cluster', type: 'helm:releases', scope: [{ dimension: 'namespace', match: 'oneOf', values: ['default'] }], route: { connection: 'cluster' } };
const props = { open: true, onClose: vi.fn(), chartID: 'repo/chart', chartName: 'Chart', connectionID: 'cluster' };

describe('Helm install V2 merge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.target.mockResolvedValue({ target });
    mocks.reference.mockResolvedValue({ route: target.route, reference: { address: { id: 'repo/chart' } } });
    mocks.execute.mockImplementation(async ({ action }) => ({ data: action === 'get-versions' ? { versions: [{ version: '1.0' }] } : action === 'get-values' ? { values: 'replicas: 2' } : { manifest: 'rendered manifest' } }));
  });

  it('installs against a real type target and includes release name and values', async () => {
    render(<InstallChartDialog {...props} />);
    await waitFor(() => expect(screen.getByText('replicas: 2')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('my-release'), { target: { value: 'new-release' } });
    fireEvent.click(screen.getByRole('button', { name: 'Install' }));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(mocks.target).toHaveBeenCalledWith('kubernetes', { route: target.route, type: target.type, scope: target.scope });
    const request = mocks.execute.mock.calls.find(([request]) => request.action === 'install')?.[0];
    expect(request).toEqual({ route: target.route, typeTarget: { provider: target.provider, authority: target.authority, type: target.type, scope: target.scope }, action: 'install', input: { name: 'new-release', chart: 'repo/chart', version: '1.0', values: { replicas: 2n } } });
    expect(request).not.toHaveProperty('reference');
  });

  it('ignores dry-run completion after dialog closes', async () => {
    const { promise, resolve: finish } = Promise.withResolvers<unknown>();
    mocks.execute.mockImplementation(({ action }) => action === 'dry-run-install' ? promise : Promise.resolve({ data: action === 'get-versions' ? { versions: [] } : { values: '' } }));
    const view = render(<InstallChartDialog {...props} />);
    fireEvent.change(screen.getByPlaceholderText('my-release'), { target: { value: 'new-release' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dry Run' }));
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledWith(expect.objectContaining({ action: 'dry-run-install' })));
    view.rerender(<InstallChartDialog {...props} open={false} />);
    await act(async () => { finish({ data: { manifest: 'stale manifest' } }); });
    view.rerender(<InstallChartDialog {...props} />);
    expect(screen.queryByText('stale manifest')).toBeNull();
  });

  it('does not replace a new chart default with an old chart read', async () => {
    const { promise, resolve } = Promise.withResolvers<unknown>();
    mocks.execute.mockImplementation(({ action, reference }) => {
      if (action === 'get-versions') return Promise.resolve({ data: { versions: [] } });
      if (reference.address.id === 'repo/chart') return promise;
      return Promise.resolve({ data: { values: 'current: true' } });
    });
    mocks.reference.mockImplementation(async (_plugin, request) => ({
      route: target.route, reference: { address: { id: request.id } },
    }));
    const view = render(<InstallChartDialog {...props} />);
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledWith(expect.objectContaining({ action: 'get-values' })));
    view.rerender(<InstallChartDialog {...props} chartID="repo/other" />);
    await waitFor(() => expect(screen.getByText('current: true')).toBeTruthy());
    await act(async () => { resolve({ data: { values: 'obsolete: true' } }); });
    expect(screen.queryByText('obsolete: true')).toBeNull();
    expect(screen.getByText('current: true')).toBeTruthy();
  });
});
