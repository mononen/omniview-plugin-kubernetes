import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResourceTable from './index';

const mocks = vi.hoisted(() => {
  const first = { key: 'host-first', record: { body: { name: 'First row' } } };
  const second = { key: 'host-second', record: { body: { name: 'Second row' } } };
  return {
    resources: vi.fn(),
    loading: false,
    firstData: { records: [first], sourcePage: { nextCursor: 'native-next' } },
    secondData: { records: [second], sourcePage: { nextCursor: undefined } },
  };
});
vi.mock('@omniviewdev/base-ui', () => ({
  Button: ({ children, disabled, onClick }: React.PropsWithChildren<{ disabled?: boolean; onClick?: () => void }>) => <button disabled={disabled} onClick={onClick}>{children}</button>,
  Stack: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Text: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Progress: () => null,
  Skeleton: () => null,
  DataTable: {
    Root: ({ children, table }: React.PropsWithChildren<{ table: { getRowModel: () => { rows: Array<{ id: string; getIsSelected: () => boolean; toggleSelected: () => void }> } } }>) => <div>{table.getRowModel().rows.map((row) => <button key={row.id} aria-pressed={row.getIsSelected()} onClick={() => row.toggleSelected()}>{row.id}</button>)}{children}</div>,
    Container: ({ children }: React.PropsWithChildren) => <table>{children}</table>,
    Header: () => null,
    VirtualBody: () => <tbody />,
  },
}));
vi.mock('@omniviewdev/runtime', () => ({
  useResourceType: () => ({ resourceType: { data: { displayName: 'Charts', capabilities: [] } } }),
  useResolvedResourceTarget: () => ({ data: { targetId: 'host-target', target: { type: 'helm:charts' } } }),
  useResources: mocks.resources,
  usePluginRouter: () => ({ location: { search: '', key: 'location', pathname: '/' } }),
  useRightDrawer: () => ({ openDrawer: vi.fn() }),
}));
vi.mock('../../../tables/ColumnFilter/useDynamicResourceColumns', () => ({ useDynamicResourceColumns: () => ({ labels: {}, annotations: {}, columnDefs: [], setLabels: vi.fn(), setAnnotations: vi.fn() }) }));
vi.mock('@/hooks/useStoredState', () => ({ useStoredState: (_key: string, initial: unknown) => React.useState(initial) }));
vi.mock('@/hooks/useConnectionNamespaces', () => ({ useConnectionNamespaces: () => ({ namespaces: [], setNamespaces: vi.fn() }) }));
vi.mock('../../drawer/DrawerActionsBridge', () => ({ default: () => null }));
vi.mock('./ResourceTableToolbar', () => ({ default: () => null }));
vi.mock('./ResourceTableErrorState', () => ({ default: () => <div>Page failed</div> }));
vi.mock('./rows', () => ({ decodeResourceTableRows: (records: Array<{ key: string; record: { body: { name: string } } }>) => ({
  rows: records.map(({ record }) => record.body),
  recordsByBody: new WeakMap(records.map((record) => [record.record.body, record])),
  rowKeys: records.map(({ key }) => key),
}) }));

const columns = [{ id: 'name', accessorKey: 'name' }];
describe('resource source-page selections', () => {
  beforeEach(() => {
    mocks.loading = false;
    mocks.resources.mockImplementation(({ request }) => {
      const second = request?.request.cursor !== undefined;
      const data = mocks.loading ? undefined : second ? mocks.secondData : mocks.firstData;
      return { acquired: data ? { request, page: data } : undefined, resources: {
        data,
        isLoading: mocks.loading, isFetching: mocks.loading, isSuccess: !mocks.loading, refetch: vi.fn(),
      } };
    });
  });

  it('retains host-key selections per page without selecting another page or clearing during acquisition', () => {
    const view = render(<ResourceTable connectionID="connection" resourceKey="helm:charts" columns={columns} />);
    fireEvent.click(screen.getByRole('button', { name: 'host-first' }));
    expect(screen.getByRole('button', { name: 'host-first' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('button', { name: 'host-first' })).toBeNull();
    expect(screen.getByRole('button', { name: 'host-second' }).getAttribute('aria-pressed')).toBe('false');
    mocks.loading = true;
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    mocks.loading = false;
    view.rerender(<ResourceTable connectionID="connection" resourceKey="helm:charts" columns={columns} />);
    expect(screen.getByRole('button', { name: 'host-first' }).getAttribute('aria-pressed')).toBe('true');
  });
});
