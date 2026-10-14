import { Chip, Separator, Stack, Text } from '@omniviewdev/base-ui';
import type { Node } from 'kubernetes-types/core/v1';
import type { Condition } from 'kubernetes-types/meta/v1';
import React from 'react';

import ConditionChip from '../../../shared/ConditionChip';
import SectionEntry from '../shared/SectionEntry';
import {
  roundedChipStyle,
  sectionBodyStyle,
  sectionBorderStyle,
  sectionHeaderStyle,
} from '../shared/sectionStyles';

interface Props {
  node: Node;
}

const NodeStatusSection: React.FC<Props> = ({ node }) => {
  const conditions = node.status?.conditions;
  const addresses = node.status?.addresses;
  const unschedulable = node.spec?.unschedulable;

  // Determine overall phase from Ready condition.
  const readyCondition = conditions?.find((c) => c.type === 'Ready');
  const phase = readyCondition?.status === 'True' ? 'Ready' : 'Not Ready';
  const phaseColor = phase === 'Ready' ? 'success' : 'danger';

  return (
    <div style={sectionBorderStyle}>
      <div style={sectionHeaderStyle}>
        <Stack direction="row" spacing={0} align="center" style={{ gap: 6, flexShrink: 0 }}>
          <Text weight="semibold" size="sm">
            Status
          </Text>
          <Chip size="xs" color={phaseColor} variant="soft" style={roundedChipStyle}>
            {phase}
          </Chip>
          {unschedulable && (
            <Chip size="xs" color="warning" variant="soft" style={roundedChipStyle}>
              Cordoned
            </Chip>
          )}
        </Stack>
        {conditions && conditions.length > 0 && (
          <Stack direction="row" spacing={1} wrap justify="end">
            {conditions.map((c) => (
              <ConditionChip
                key={c.type}
                condition={c as unknown as Condition}
                flipped={c.type !== 'Ready'}
                unhealthyColor="warning"
              />
            ))}
          </Stack>
        )}
      </div>
      <Separator />
      <div style={sectionBodyStyle}>
        {addresses?.map((addr) => (
          <SectionEntry key={addr.type} labelSpan={3} label={addr.type || ''} value={addr.address} />
        ))}
        {node.spec?.podCIDR && (
          <SectionEntry labelSpan={3} label="Pod CIDR" value={node.spec.podCIDR} />
        )}
      </div>
    </div>
  );
};

export default NodeStatusSection;
