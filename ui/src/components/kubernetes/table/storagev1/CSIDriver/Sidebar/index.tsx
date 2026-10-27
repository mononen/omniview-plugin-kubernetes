import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { CSIDriver } from 'kubernetes-types/storage/v1';
import React from 'react';

import LabeledEntry from '../../../../../shared/LabeledEntry';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import SidebarSection from '../../../../../shared/SidebarSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<CSIDriver>;
}

export const CSIDriverSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const driver = ctx.data;
  const spec = driver.spec;

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={driver.metadata} connectionID={ctx.resource?.connectionID} />

        {spec && (
          <SidebarSection title="Capabilities">
              <LabeledEntry
                label="Attach Required"
                value={spec.attachRequired === false ? 'No' : 'Yes'}
              />
              <LabeledEntry
                label="Pod Info on Mount"
                value={spec.podInfoOnMount ? 'Yes' : 'No'}
              />
              <LabeledEntry label="FS Group Policy" value={spec.fsGroupPolicy} />
              {spec.volumeLifecycleModes && spec.volumeLifecycleModes.length > 0 && (
                <LabeledEntry
                  label="Volume Lifecycle"
                  value={spec.volumeLifecycleModes.join(', ')}
                />
              )}
              <LabeledEntry
                label="Storage Capacity"
                value={spec.storageCapacity ? 'Yes' : 'No'}
              />
              <LabeledEntry
                label="Requires Republish"
                value={spec.requiresRepublish ? 'Yes' : 'No'}
              />
              <LabeledEntry
                label="SELinux Mount"
                value={spec.seLinuxMount ? 'Yes' : 'No'}
              />
          </SidebarSection>
        )}
      </Stack>
    </Stack>
  );
};

CSIDriverSidebar.displayName = 'CSIDriverSidebar';
export default CSIDriverSidebar;
