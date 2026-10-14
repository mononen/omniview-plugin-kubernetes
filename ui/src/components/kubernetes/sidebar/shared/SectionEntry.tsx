import { Grid, Text } from '@omniviewdev/base-ui';
import React from 'react';

import { entryRowStyle, entryValueStyle } from './sectionStyles';

export interface SectionEntryProps {
  label: string;
  /** String values render as bold small text; nodes render as-is. Nothing renders when empty. */
  value?: string | React.ReactNode;
  /** Columns (of 12) used by the label. @default 4 */
  labelSpan?: number;
  /** Truncate long string values with an ellipsis. */
  truncate?: boolean;
}

/**
 * Label / value row used inside sidebar section cards.
 */
const SectionEntry: React.FC<SectionEntryProps> = ({ label, value, labelSpan = 4, truncate }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <Grid columns={12} spacing={0} style={entryRowStyle}>
      <Grid.Item span={labelSpan}>
        <Text tone="muted" size="xs">
          {label}
        </Text>
      </Grid.Item>
      <Grid.Item span={12 - labelSpan} style={{ minWidth: 0 }}>
        {typeof value === 'string' ? (
          <Text
            as="div"
            style={entryValueStyle}
            size="xs"
            truncate={truncate}
          >
            {value}
          </Text>
        ) : (
          value
        )}
      </Grid.Item>
    </Grid>
  );
};

export default SectionEntry;
