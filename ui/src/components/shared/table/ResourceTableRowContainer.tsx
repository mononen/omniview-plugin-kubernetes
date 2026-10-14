import { type Row, flexRender } from '@tanstack/react-table';
import { type VirtualItem } from '@tanstack/react-virtual';
import React from 'react';

import type { KubernetesResourceObject } from '../../../types/resource';

import styles from './ResourceTable/ResourceTable.module.css';
import { type Memoizer } from './types';
import { getBodyCellStyles } from './utils';

export type Props<T = KubernetesResourceObject> = {
  memoizer?: Memoizer;
  resourceKey: string;
  resourceID: string;
  connectionID: string;
  columnVisibility: string;
  resizedColumnIds: string;
  virtualRow: VirtualItem;
  isSelected: boolean;
  onRowClick: (id: string, data: KubernetesResourceObject) => void;
  /** The row data */
  row: Row<T>;
};

/**
 * The row container component for the resource table. Responsible for rendering the row contents, and optionally
 * memoizing the cells based on the memoizer function provided.
 */
export const RowContainer: React.FC<Props> = ({
  resourceID,
  virtualRow,
  isSelected,
  row,
  onRowClick,
}) => {
  'use no memo';
  const handleRowClick = (column: string) => {
    if (column !== 'select' && column !== 'menu') {
      onRowClick(resourceID, row.original);
    }
  };

  return (
    <tr
      data-index={virtualRow.index}
      data-selected={isSelected ? 'true' : undefined}
      className={styles.row}
      style={{ transform: `translateY(${virtualRow.start}px)` }}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className={styles.cell}
          data-pinned={cell.column.getIsPinned() || undefined}
          onClick={() => {
            handleRowClick(cell.column.id);
          }}
          style={getBodyCellStyles(cell.column)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
};

RowContainer.displayName = 'RowContainer';
export default RowContainer;
