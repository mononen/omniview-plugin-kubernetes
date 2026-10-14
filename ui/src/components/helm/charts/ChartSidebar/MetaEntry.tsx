import { Stack, Text } from '@omniviewdev/base-ui';
import React from 'react';

const metaLabelStyle: React.CSSProperties = { flexShrink: 0 };

const metaValueStyle: React.CSSProperties = { textAlign: 'right' };

const MetaEntry: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" justify="between" align="center">
    <Text tone="muted" style={metaLabelStyle} size="sm">
      {label}
    </Text>
    <Text tone="default" style={metaValueStyle} weight="semibold" size="sm">
      {value}
    </Text>
  </Stack>
);

MetaEntry.displayName = 'MetaEntry';
export default MetaEntry;
