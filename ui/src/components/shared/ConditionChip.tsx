import { Chip } from '@omniviewdev/base-ui';
import { Condition } from 'kubernetes-types/meta/v1';
import React from 'react';

import SimpleTooltip from './SimpleTooltip';

type Props = {
  /** The kubernetes condition */
  condition: Condition;

  /** Flip the status so that 'False' is treated as healthy */
  flipped?: boolean;

  /** The color level to use for the unhealthy value. Defaults to 'faded' */
  unhealthyColor?: 'warning' | 'danger' | 'neutral' | 'faded';

  /** The color level to use for the healthy value. Defaults to 'success' */
  healthyColor?: 'success' | 'neutral';
};

const chipStyle: React.CSSProperties = { borderRadius: 4 };
const fadedChipStyle: React.CSSProperties = { borderRadius: 4, opacity: 0.45 };

/**
 * Renders a chip based on the incoming condition.
 * Healthy = subtle green soft, unhealthy = faded grey.
 */
export const ConditionChip: React.FC<Props> = ({
  condition,
  flipped,
  unhealthyColor = 'faded',
  healthyColor = 'success',
}) => {
  const healthy = flipped ? condition.status === 'False' : condition.status === 'True';

  const color = healthy ? healthyColor : unhealthyColor === 'faded' ? 'neutral' : unhealthyColor;
  const faded = !healthy && unhealthyColor === 'faded';

  return (
    <SimpleTooltip size="sm" content={condition.message}>
      <Chip size="xs" color={color} variant="soft" style={faded ? fadedChipStyle : chipStyle}>
        {condition.type}
      </Chip>
    </SimpleTooltip>
  );
};

export default ConditionChip;
