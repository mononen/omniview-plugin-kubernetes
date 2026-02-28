import Box from '@mui/material/Box';
import { Checkbox } from '@omniviewdev/ui/inputs';
import { type Row } from '@tanstack/react-table';

// ---------------------------------------------------------------------------
// Static styles
// ---------------------------------------------------------------------------

const selectBoxSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  maxWidth: 24,
} as const;

export const SelectBoxRow = ({ row, checked }: { row: Row<Record<string, unknown>>; checked: boolean }) => (
  <Box sx={selectBoxSx}>
    <Checkbox
      size="sm"
      checked={checked}
      onChange={(value) => {
        row.toggleSelected(value);
      }}
      aria-label="Select row"
    />
  </Box>
);

SelectBoxRow.displayName = 'SelectBoxRow';
export default SelectBoxRow;
