import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { ComponentStatus } from 'kubernetes-types/core/v1';
import type { Condition } from 'kubernetes-types/meta/v1';
import React from 'react';

import ConditionChip from '../../../../../shared/ConditionChip';
import LabeledEntry from '../../../../../shared/LabeledEntry';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import SidebarSection from '../../../../../shared/SidebarSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<ComponentStatus>;
}

export const ComponentStatusSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const cs = ctx.data;
  const conditions = cs.conditions || [];

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={cs.metadata} connectionID={ctx.resource?.connectionID} />

        {conditions.length > 0 && (
          <SidebarSection
            title="Conditions"
            headerRight={
              <Stack direction="row" spacing={1} wrap justify="end">
                {conditions.map((c) => (
                  <ConditionChip key={c.type} condition={c as Condition} />
                ))}
              </Stack>
            }
          >
            {conditions.map((c) => (
              <React.Fragment key={c.type}>
                <LabeledEntry label="Type" value={c.type} />
                <LabeledEntry label="Status" value={c.status} />
                {c.message && <LabeledEntry label="Message" value={c.message} />}
                {c.error && <LabeledEntry label="Error" value={c.error} />}
              </React.Fragment>
            ))}
          </SidebarSection>
        )}
      </Stack>
    </Stack>
  );
};

ComponentStatusSidebar.displayName = 'ComponentStatusSidebar';
export default ComponentStatusSidebar;
