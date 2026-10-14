import { Text } from '@omniviewdev/base-ui';
import React from 'react';

import { tileStyle, tileLabelStyle, tileValueStyle } from './constants';

interface MetricTileProps {
  label: string;
  value: string;
}

const MetricTile: React.FC<MetricTileProps> = ({ label, value }) => (
  <div style={tileStyle}>
    <Text size="xs" tone="muted" style={tileLabelStyle}>
      {label}
    </Text>
    <Text size="sm" weight="semibold" style={tileValueStyle}>
      {value}
    </Text>
  </div>
);

export default MetricTile;
