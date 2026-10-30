import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrawerContext } from '@omniviewdev/runtime';
import { RepoSidebar } from './RepoSidebar';

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), resources: vi.fn(), sidebar: vi.fn(), refresh: vi.fn() }));
vi.mock('@omniviewdev/base-ui', () => ({
  Card: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => onClick ? <button type="button" onClick={onClick}>{children}</button> : <div>{children}</div>,
  Chip: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Button: ({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  IconButton: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
  Input: { Control: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> },
  Separator: () => <hr />,
  Stack: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Text: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}));
vi.mock('@omniviewdev/runtime', () => ({
  useResolvedResourceTarget: mocks.resolve,
  useResources: (options: { request?: unknown }) => {
    const result = mocks.resources(options);
    return { ...result, refreshAcquiredPage: result.resources.refetch, acquired: result.resources.data ? { request: options.request, page: result.resources.data } : undefined };
  },
  useExecuteAction: () => ({ executeAction: vi.fn(), isExecuting: false }),
  useRightDrawer: () => ({ showResourceSidebar: mocks.sidebar }),
  valueToJSON: (value: unknown) => value,
  jsonToValue: (value: unknown) => value,
}));
vi.mock('../../shared/NamedAvatar', () => ({ default: () => <span /> }));

function context(repository = 'native-repo') {
  return {
    data: { name: 'not-the-native-id', url: 'https://unused.invalid' },
    resource: { route: { connection: 'connection' }, reference: { address: { id: repository } } },
  } as DrawerContext<{ name?: string; url?: string }>;
}

describe('repository chart source pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolve.mockImplementation(({ scope }) => ({ data: { targetId: JSON.stringify(scope), target: { scope } } }));
    mocks.resources.mockImplementation(({ request }) => {
      const second = request?.request.cursor !== undefined;
      return { resources: {
        data: {
          records: [{ key: second ? 'host-second' : 'host-first', route: { connection: 'connection' }, targetId: 'host-target', record: {
            reference: { address: { id: second ? 'opaque-chart-second' : 'opaque-chart-first' } },
            representation: { id: 'helm-native-v1' }, body: { name: second ? 'Later chart' : 'Selected chart', repository: 'native-repo' },
          } }],
          sourcePage: { nextCursor: second ? undefined : 'source-cursor/256', count: { kind: 'unknown' } },
        }, isSuccess: true, isFetching: false, refetch: mocks.refresh,
      } };
    });
  });

  it('queries selected native repository before pagination and opens host records unchanged', () => {
    render(<RepoSidebar ctx={context()} />);
    expect(mocks.resolve).toHaveBeenCalledWith(expect.objectContaining({
      type: 'helm:charts', scope: [
        { dimension: 'domain', match: 'oneOf', values: ['helm-client'] },
        { dimension: 'repository', match: 'oneOf', values: ['native-repo'] },
      ],
    }));
    expect(mocks.resources).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Selected chart'));
    expect(mocks.sidebar).toHaveBeenCalledWith(expect.objectContaining({
      reference: { address: { id: 'opaque-chart-first' } }, targetId: 'host-target',
      record: expect.objectContaining({ key: 'host-first' }),
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(mocks.resources).toHaveBeenLastCalledWith(expect.objectContaining({
      request: expect.objectContaining({ request: expect.objectContaining({ cursor: 'source-cursor/256', pageSize: 256 }) }),
    }));
    expect(screen.queryByText('Selected chart')).toBeNull();
    expect(screen.getByText('Later chart')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh page' }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('resets source cursor when selected native repository changes', () => {
    const view = render(<RepoSidebar ctx={context()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    view.rerender(<RepoSidebar ctx={context('other-native-repo')} />);
    expect(mocks.resources).toHaveBeenLastCalledWith(expect.objectContaining({
      request: expect.objectContaining({ request: expect.objectContaining({ cursor: undefined }) }),
    }));
  });
});
