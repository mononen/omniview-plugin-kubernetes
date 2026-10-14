import { Checkbox, IconButton, Popover, Text } from '@omniviewdev/base-ui';
import React from 'react';
import { LuColumns3 } from 'react-icons/lu';

import styles from './Connections.module.css';

type Props = {
  allColumns: string[];
  visibleColumns: string[];
  onToggleColumn: (column: string) => void;
};

const popupStyle: React.CSSProperties = {
  minWidth: 160,
  maxHeight: 280,
  overflow: 'auto',
  padding: 4,
};

const headingStyle: React.CSSProperties = {
  display: 'block',
  padding: '0 4px 2px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontSize: '0.625rem',
};

const columnLabelStyle: React.CSSProperties = { userSelect: 'none' };

function formatColumnName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const ColumnPicker: React.FC<Props> = ({ allColumns, visibleColumns, onToggleColumn }) => {
  const [open, setOpen] = React.useState(false);

  // Sort: visible first, then alphabetical
  const sorted = [...allColumns].sort((a, b) => {
    const aVis = visibleColumns.includes(a) ? 0 : 1;
    const bVis = visibleColumns.includes(b) ? 0 : 1;
    if (aVis !== bVis) return aVis - bVis;
    return a.localeCompare(b);
  });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <IconButton
            size="xs"
            variant="ghost"
            color="neutral"
            title="Select visible columns"
            aria-label="Select visible columns"
          >
            <LuColumns3 size={12} />
          </IconButton>
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={4}>
          <Popover.Popup style={popupStyle}>
            <Text size="xs" weight="semibold" tone="muted" style={headingStyle}>
              Visible Columns
            </Text>
            {sorted.map((col) => (
              <label key={col} className={styles.columnRow}>
                <Checkbox
                  size="sm"
                  checked={visibleColumns.includes(col)}
                  onCheckedChange={() => onToggleColumn(col)}
                />
                <Text size="xs" style={columnLabelStyle}>
                  {formatColumnName(col)}
                </Text>
              </label>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default ColumnPicker;
