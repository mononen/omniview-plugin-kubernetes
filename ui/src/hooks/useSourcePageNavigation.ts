import { useRef, useState } from 'react';

const HISTORY_LIMIT = 16;
type Position = { cursor?: string; number: number };
type Navigation = { context: string; current: Position; previous: Position[] };

export interface SourcePageNavigation {
  cursor?: string;
  pageNumber: number;
  displayedCursor?: string;
  isFirstRequest: boolean;
  forAcquiredPage: (cursor: string | undefined) => SourcePageNavigation;
  canPrevious: boolean;
  firstPage: () => void;
  previousPage: () => void;
  nextPage: (cursor: string | undefined) => void;
}

/** UI cursor navigation only. Keep one page of rows and at most 16 prior cursors. */
export function useSourcePageNavigation(context: string): SourcePageNavigation {
  const [state, setState] = useState<Navigation>();
  const acquiredPosition = useRef<{ context: string; position: Position } | undefined>(undefined);
  if (state && state.context !== context) setState(undefined);
  const current = state?.context === context ? state.current : { number: 1 };
  const previous = state?.context === context ? state.previous : [];
  const navigation: SourcePageNavigation = {
    cursor: current.cursor,
    pageNumber: current.number,
    displayedCursor: current.cursor,
    forAcquiredPage: (cursor) => {
      const position = [current, ...previous].find((entry) => entry.cursor === cursor)
        ?? (acquiredPosition.current?.context === context && acquiredPosition.current.position.cursor === cursor
          ? acquiredPosition.current.position : { cursor, number: 1 });
      acquiredPosition.current = { context, position };
      return { ...navigation, displayedCursor: cursor, pageNumber: position.number };
    },
    isFirstRequest: current.number === 1,
    canPrevious: previous.length > 0,
    firstPage: () => setState(undefined),
    previousPage: () => setState((value) => {
      if (value?.context !== context || !value.previous.length) return value;
      return { context, current: value.previous[value.previous.length - 1], previous: value.previous.slice(0, -1) };
    }),
    nextPage: (cursor: string | undefined) => {
      if (cursor === undefined) return;
      setState((value) => {
        const active = value?.context === context ? value : { context, current: { number: 1 }, previous: [] };
        return {
          context,
          current: { cursor, number: active.current.number + 1 },
          previous: [...active.previous, active.current].slice(-HISTORY_LIMIT),
        };
      });
    },
  };
  return navigation;
}
