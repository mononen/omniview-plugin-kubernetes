import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import { type Row } from '@tanstack/react-table';

const selectCellContainerSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  maxWidth: 24,
} as const;

const selectCellCheckboxSx = {
  p: 0,
  color: 'var(--ov-fg-faint)',
  '&.Mui-checked': {
    color: 'var(--ov-accent-fg)',
  },
} as const;

/**
 * Render a selectbox for a row of the generic resource table.
 *
 * IMPORTANT: `checked` is passed as a primitive boolean prop rather than being
 * read via `row.getIsSelected()` inside this component. This is required
 * because the React Compiler auto-memoizes component output based on prop
 * identity. Since the TanStack `row` object reference is stable (the row
 * model is cached when only selection state changes), the compiler would
 * treat re-renders as no-ops and produce a stale `checked` value.
 * By receiving a primitive boolean, the compiler correctly detects the change.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SelectCell = ({ row, checked }: { row: Row<any>; checked: boolean }) => (
  <Box sx={selectCellContainerSx}>
    <Checkbox
      size="small"
      checked={checked}
      onChange={(_event, value) => {
        row.toggleSelected(value);
      }}
      aria-label="Select row"
      sx={selectCellCheckboxSx}
    />
  </Box>
);

SelectCell.displayName = 'SelectCell';
export default SelectCell;
