import { Chip, Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { CSINode } from 'kubernetes-types/storage/v1';
import React from 'react';

import ExpandableSections, { type ExpandableSection } from '../../../../../shared/ExpandableSections';
import LabeledEntry from '../../../../../shared/LabeledEntry';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

const cardContentStyle = { paddingInline: 8, paddingBlock: 4 } as const;

const fullWidthStyle = { width: '100%' } as const;

const chipStyle = { borderRadius: 4 } as const;

interface Props {
  ctx: DrawerContext<CSINode>;
}

export const CSINodeSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const node = ctx.data;
  const drivers = node.spec?.drivers;

  const sections: ExpandableSection[] = (drivers || []).map((driver, i) => ({
    title: driver.name || `Driver ${i + 1}`,
    defaultExpanded: i === 0,
    children: (
      <Stack direction="column" spacing={1} style={cardContentStyle}>
        <LabeledEntry label="Node ID" value={driver.nodeID} />
        {driver.topologyKeys && driver.topologyKeys.length > 0 && (
          <LabeledEntry
            label="Topology Keys"
            value={
              <Stack direction="row" spacing={1} wrap>
                {driver.topologyKeys.map((key) => (
                  <Chip key={key} size="xs" color="neutral" style={chipStyle}>{key}</Chip>
                ))}
              </Stack>
            }
          />
        )}
        {driver.allocatable?.count !== undefined && (
          <LabeledEntry label="Allocatable Count" value={String(driver.allocatable.count)} />
        )}
      </Stack>
    ),
  }));

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <ObjectMetaSection data={node.metadata} connectionID={ctx.resource?.connectionID} />
      {sections.length > 0 && <ExpandableSections sections={sections} />}
    </Stack>
  );
};

CSINodeSidebar.displayName = 'CSINodeSidebar';
export default CSINodeSidebar;
