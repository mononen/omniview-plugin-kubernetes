import { ClipboardText, Text } from '@omniviewdev/base-ui';
import React from 'react';

const entryValueStyle: React.CSSProperties = { fontWeight: 600, fontSize: 12, width: '100%', minWidth: 0 };
const cellStyle: React.CSSProperties = { minWidth: 0 };

interface Props {
  label: string;
  value?: string | React.ReactNode;
  /** Grid column width for the label (out of 12). Defaults to 4. */
  labelSize?: number;
}

const LabeledEntry: React.FC<Props> = ({ label, value, labelSize = 4 }) => {
  if (value === undefined || value === null) return null;
  const clamped = Math.min(Math.max(labelSize, 1), 11);
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `minmax(0, ${clamped}fr) minmax(0, ${12 - clamped}fr)`,
    minHeight: 22,
    alignItems: 'center',
  };
  return (
    <div style={gridStyle}>
      <div style={cellStyle}>
        <Text tone="muted" size="xs">
          {label}
        </Text>
      </div>
      <div style={cellStyle}>
        {typeof value === 'string' ? (
          <ClipboardText value={value} truncate style={entryValueStyle} />
        ) : (
          value
        )}
      </div>
    </div>
  );
};

export default LabeledEntry;
