import { type Column } from '@tanstack/react-table';
import { type CSSProperties } from 'react';

/**
 * Width and pinning styles for a body cell. Mirrors base-ui DataTable's
 * header sizing (resizable columns grow in proportion to their size, fixed
 * ones keep their width) so body cells line up with DataTable.Header.
 */
export const getBodyCellStyles = <T,>(column: Column<T, unknown>): CSSProperties => {
  const size = `var(--col-${column.id}-size)`;
  const isPinned = column.getIsPinned();
  const styles: CSSProperties = {
    flex: column.getCanResize() ? `${size} 0 0px` : `0 0 calc(${size} * 1px)`,
    width: `calc(${size} * 1px)`,
  };
  if (!isPinned) return styles;

  const isLastLeft = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRight = isPinned === 'right' && column.getIsFirstColumn('right');
  return {
    ...styles,
    position: 'sticky',
    zIndex: 1,
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    boxShadow: isLastLeft
      ? '-4px 0 4px -4px rgb(0 0 0 / 0.12) inset'
      : isFirstRight
        ? '4px 0 4px -4px rgb(0 0 0 / 0.12) inset'
        : undefined,
  };
};
