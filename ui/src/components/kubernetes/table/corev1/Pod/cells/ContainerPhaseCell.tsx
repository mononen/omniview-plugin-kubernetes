import { Text } from '@omniviewdev/base-ui';
import React from 'react';

type PhaseColor = 'success' | 'info' | 'danger' | 'neutral';

const colorMap: Record<string, PhaseColor> = {
  Active: 'success',
  Pending: 'info',
  Running: 'success',
  Succeeded: 'success',
  Failed: 'danger',
  Unknown: 'info',
  Terminating: 'neutral',
  Terminated: 'danger',
};

const toneMap = {
  success: 'success',
  danger: 'danger',
  neutral: 'muted',
} as const;

// base-ui Text has no "info" tone, so info is applied via the info token.
const infoStyle = { color: 'var(--ov-color-info)' } as const;

type Props = {
  value: string | undefined;
};

const ContainerPhaseCell: React.FC<Props> = ({ value }) => {
  if (!value || !colorMap[value]) {
    return null;
  }
  const color = colorMap[value];
  if (color === 'info') {
    return <Text style={infoStyle}>{value}</Text>;
  }
  return <Text tone={toneMap[color]}>{value}</Text>;
};

export default ContainerPhaseCell;
