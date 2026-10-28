import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSourcePageNavigation } from './useSourcePageNavigation';

describe('source page navigation', () => {
  it('consumes opaque cursors only on explicit navigation', () => {
    const { result } = renderHook(() => useSourcePageNavigation('target'));
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.pageNumber).toBe(1);
    act(() => result.current.nextPage('opaque/%cursor'));
    expect(result.current.cursor).toBe('opaque/%cursor');
    expect(result.current.pageNumber).toBe(2);
    act(() => result.current.previousPage());
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.pageNumber).toBe(1);
  });

  it('bounds history while retaining explicit first-page access', () => {
    const { result } = renderHook(() => useSourcePageNavigation('target'));
    for (let page = 1; page <= 40; page++) act(() => result.current.nextPage(`cursor-${page}`));
    expect(result.current.pageNumber).toBe(41);
    for (let page = 0; page < 16; page++) act(() => result.current.previousPage());
    expect(result.current.pageNumber).toBe(25);
    expect(result.current.canPrevious).toBe(false);
    act(() => result.current.previousPage());
    expect(result.current.pageNumber).toBe(25);
    act(() => result.current.firstPage());
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.cursor).toBeUndefined();
  });

  it('resets synchronously when host target or query context changes', () => {
    const { result, rerender } = renderHook(({ context }) => useSourcePageNavigation(context), { initialProps: { context: 'repo-a' } });
    act(() => result.current.nextPage('repo-a-cursor'));
    rerender({ context: 'repo-b' });
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.canPrevious).toBe(false);
    act(() => result.current.nextPage('repo-b-cursor'));
    expect(result.current.pageNumber).toBe(2);
    act(() => result.current.previousPage());
    expect(result.current.cursor).toBeUndefined();
  });

  it('keeps the acquired label when Previous or First requests another page', () => {
    const { result } = renderHook(() => useSourcePageNavigation('target'));
    act(() => result.current.nextPage('second'));
    expect(result.current.forAcquiredPage('second').pageNumber).toBe(2);
    act(() => result.current.previousPage());
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.forAcquiredPage('second').pageNumber).toBe(2);
    act(() => result.current.firstPage());
    expect(result.current.forAcquiredPage('second').pageNumber).toBe(2);
    expect(result.current.forAcquiredPage(undefined).pageNumber).toBe(1);
  });
});
