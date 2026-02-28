import { type CellContext, type ColumnDef, type HeaderContext } from '@tanstack/react-table';

import { SelectCell } from '../cells/SelectCell';
import { SelectBoxHeader } from '../headers/SelectHeader';

/**
 * Inline cell wrapper that reads the checked state from the table's controlled
 * rowSelection and passes it as a primitive boolean to SelectCell.
 *
 * The `'use no memo'` directive opts this out of the React Compiler's automatic
 * memoization. Without it, the compiler caches the output based on prop identity
 * — and since TanStack's `row` and `table` are stable references across renders,
 * it would return stale `checked` values when only selection state changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectCellWrapper = ({ row, table }: CellContext<any, unknown>) => {
  'use no memo';
  return <SelectCell row={row} checked={!!table.getState().rowSelection[row.id]} />;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectHeaderWrapper = ({ table }: HeaderContext<any, unknown>) => {
  'use no memo';
  return (
    <SelectBoxHeader
      checked={table.getIsAllPageRowsSelected()}
      indeterminate={table.getIsSomePageRowsSelected()}
      onToggle={(checked) => table.toggleAllPageRowsSelected(checked)}
    />
  );
};

export const selectColumn = <T extends { metadata?: { name?: string } }>(): ColumnDef<T> => ({
  id: 'select',
  header: SelectHeaderWrapper,
  cell: SelectCellWrapper,
  size: 34,
  enableResizing: false,
  enableSorting: false,
  enableHiding: false,
});

export default selectColumn;
