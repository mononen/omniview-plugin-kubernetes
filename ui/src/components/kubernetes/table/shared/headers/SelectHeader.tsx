import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';

const selectHeaderContainerSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  maxWidth: 24,
} as const;

const selectHeaderCheckboxSx = {
  p: 0,
  color: 'var(--ov-fg-faint)',
  '&.Mui-checked, &.MuiCheckbox-indeterminate': {
    color: 'var(--ov-accent-fg)',
  },
} as const;

/**
 * Render a selectbox for the header of the generic resource table.
 *
 * Accepts primitive props (`checked`, `indeterminate`, `onToggle`) rather than
 * reading from the TanStack `table` instance directly. This ensures the React
 * Compiler correctly detects state changes — see selectColumn.tsx for details.
 */
export const SelectBoxHeader = ({
  checked,
  indeterminate,
  onToggle,
}: {
  checked: boolean;
  indeterminate: boolean;
  onToggle: (checked: boolean) => void;
}) => (
  <Box sx={selectHeaderContainerSx}>
    <Checkbox
      size="small"
      checked={checked}
      indeterminate={indeterminate}
      onChange={(_event, value) => {
        onToggle(value);
      }}
      aria-label="Select all rows"
      sx={selectHeaderCheckboxSx}
    />
  </Box>
);

SelectBoxHeader.displayName = 'SelectBoxHeader';

export default SelectBoxHeader;
