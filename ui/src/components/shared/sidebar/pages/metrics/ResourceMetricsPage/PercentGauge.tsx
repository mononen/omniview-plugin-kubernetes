import { Progress, Stack, Text } from '@omniviewdev/base-ui';
import React from 'react';

import { gaugeWrapperStyle, gaugeHeaderStyle, gaugeValueStyle } from './constants';

interface PercentGaugeProps {
  label: string;
  value: number;
}

const PercentGauge: React.FC<PercentGaugeProps> = ({ label, value }) => {
  const color = value >= 90 ? 'danger' : value >= 70 ? 'warning' : 'brand';
  return (
    <div style={gaugeWrapperStyle}>
      <Stack direction="row" justify="between" align="baseline" style={gaugeHeaderStyle}>
        <Text size="xs" tone="muted">
          {label}
        </Text>
        <Text size="xs" weight="semibold" style={gaugeValueStyle}>
          {value.toFixed(1)}%
        </Text>
      </Stack>
      <Progress size="xs" value={Math.min(value, 100)} color={color} aria-label={label} />
    </div>
  );
};

export default PercentGauge;
