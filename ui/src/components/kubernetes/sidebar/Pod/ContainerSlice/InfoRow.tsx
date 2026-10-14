import { ClipboardText, Grid, Stack, Text } from '@omniviewdev/base-ui';
import React from 'react';

import Icon from '../../../../shared/Icon';

import {
  fontSize13Style,
  infoRowLabelCellStyle,
  infoRowStyle,
  infoRowValueCellStyle,
} from './styles';

const infoRowValueStyle: React.CSSProperties = {
  wordBreak: 'break-all',
  lineHeight: 1.6,
  fontSize: 13,
  paddingBlock: 2,
};

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <Grid columns={12} spacing={1} style={infoRowStyle}>
    <Grid.Item span={3} style={infoRowLabelCellStyle}>
      <Stack direction="row" spacing={0} align="center" style={{ gap: 6 }}>
        <Icon name={icon} size={14} />
        <Text style={fontSize13Style}>{label}</Text>
      </Stack>
    </Grid.Item>
    <Grid.Item span={9} style={infoRowValueCellStyle}>
      <ClipboardText value={value} truncate={false} style={infoRowValueStyle} />
    </Grid.Item>
  </Grid>
);

export default InfoRow;
