import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SourcePageControls } from './SourcePageControls';
import { useSourcePageNavigation } from '../../hooks/useSourcePageNavigation';

vi.mock('@omniviewdev/base-ui', () => ({
  Button: ({ children, disabled, onClick }: React.PropsWithChildren<{ disabled?: boolean; onClick?: () => void }>) => <button disabled={disabled} onClick={onClick}>{children}</button>,
  Stack: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Text: ({ children, role }: React.PropsWithChildren<{ role?: string }>) => <span role={role}>{children}</span>,
}));

describe('bounded source page controls', () => {
  it('never consumes a cursor before user action and preserves recovery controls while loading', () => {
    const nextPage = vi.fn();
    const previousPage = vi.fn();
    const firstPage = vi.fn();
    const refresh = vi.fn();
    const pagination = { cursor: 'current', displayedCursor: 'current', isFirstRequest: false, forAcquiredPage: vi.fn(), pageNumber: 2, canPrevious: true, firstPage, previousPage, nextPage };
    const view = render(<SourcePageControls pagination={pagination} nextCursor="opaque-next" refresh={refresh} membershipStale />);
    expect(nextPage).not.toHaveBeenCalled();
    expect(screen.getByText(/total unknown/)).toBeTruthy();
    expect(screen.getByText(/Page membership may have changed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(nextPage).toHaveBeenCalledWith('opaque-next');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh page' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    view.rerender(<SourcePageControls pagination={pagination} loading />);
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(previousPage).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    expect(firstPage).toHaveBeenCalledTimes(1);
  });

  it('labels acquired rows honestly across failed navigation, retry, and Previous', () => {
    function Pages({ failed, acquiredCursor }: { failed: boolean; acquiredCursor?: string }) {
      const navigation = useSourcePageNavigation('target');
      const pagination = navigation.forAcquiredPage(acquiredCursor);
      return <>
        <div>Rows: {acquiredCursor ?? 'first'}</div>
        <div>Request: {navigation.cursor ?? 'first'}</div>
        <SourcePageControls pagination={pagination} nextCursor="second" error={failed ? new Error('offline') : undefined} retry={retry} />
      </>;
    }
    const retry = vi.fn();
    const view = render(<Pages failed={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    view.rerender(<Pages failed />);
    expect(screen.getByText('Rows: first')).toBeTruthy();
    expect(screen.getByText('Request: second')).toBeTruthy();
    expect(screen.getByText(/Resources: page 1/)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('offline');
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('Request: first')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    view.rerender(<Pages failed={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    view.rerender(<Pages failed />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry page' }));
    expect(retry).toHaveBeenCalledTimes(1);
    view.rerender(<Pages failed={false} acquiredCursor="second" />);
    expect(screen.getByText('Rows: second')).toBeTruthy();
    expect(screen.getByText(/Resources: page 2/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
