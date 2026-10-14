import { Chip, Stack } from '@omniviewdev/base-ui';
import type { Condition } from 'kubernetes-types/meta/v1';
import React from 'react';

import ConditionChip from './ConditionChip';
import LabeledEntry from './LabeledEntry';
import SidebarSection from './SidebarSection';

interface Props {
  title: string;
  counts: Array<{ label: string; value?: number }>;
  conditions?: Condition[];
  paused?: boolean;
}

const WorkloadStatusSection: React.FC<Props> = ({ title, counts, conditions, paused }) => {
  return (
    <SidebarSection
      title={title}
      headerLeft={paused ? <Chip size="xs" variant="soft" color="warning">Paused</Chip> : undefined}
      headerRight={conditions && conditions.length > 0 ? (
        <Stack direction="row" spacing={1} wrap justify="end">
          {conditions.map((c) => (
            <ConditionChip key={c.type} condition={c} />
          ))}
        </Stack>
      ) : undefined}
    >
      {counts.map((c) => (
        <LabeledEntry
          key={c.label}
          label={c.label}
          value={c.value !== undefined ? String(c.value) : undefined}
        />
      ))}
    </SidebarSection>
  );
};

export default WorkloadStatusSection;
