import Box from '@mui/material/Box';
import { Checkbox } from '@omniviewdev/ui/inputs';

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

export const SelectBoxHeader = ({
  checked,
  indeterminate,
  onToggle,
}: {
  checked: boolean;
  indeterminate: boolean;
  onToggle: (checked: boolean) => void;
}) => (
  <Box sx={selectBoxSx}>
    <Checkbox
      size="sm"
      checked={checked}
      indeterminate={indeterminate}
      onChange={(value) => {
        onToggle(value);
      }}
      aria-label="Select all rows"
    />
  </Box>
);

SelectBoxHeader.displayName = 'SelectBoxHeader';

export default SelectBoxHeader;
