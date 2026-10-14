import { Separator, Text } from '@omniviewdev/base-ui';
import type React from 'react';

import { infoRowStyle, infoLabelStyle } from './constants';

const valueStyle: React.CSSProperties = { wordBreak: 'break-all' };
const emptyValueStyle: React.CSSProperties = { wordBreak: 'break-all', opacity: 0.4, fontStyle: 'italic' };

function InfoRow({ label, value }: { label: string; value?: string }) {
  const empty = !value;
  return (
    <>
      <div style={infoRowStyle}>
        <Text size="xs" tone="muted" style={infoLabelStyle}>
          {label}
        </Text>
        <Text size="sm" weight="medium" style={empty ? emptyValueStyle : valueStyle}>
          {empty ? 'Not discovered' : value}
        </Text>
      </div>
      <Separator />
    </>
  );
}

export default InfoRow;
