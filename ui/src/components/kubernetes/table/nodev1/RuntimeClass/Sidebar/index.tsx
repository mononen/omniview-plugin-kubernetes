import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import { RuntimeClass } from 'kubernetes-types/node/v1';
import React from 'react';

import MetadataSection from '../../../../../shared/sidebar/pages/overview/sections/MetadataSection';

import RuntimeClassHandlerSection from './RuntimeClassHandlerSection';
import RuntimeClassSchedulingSection from './RuntimeClassSchedulingSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<RuntimeClass>;
}

export const RuntimeClassSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) {
    return null;
  }

  const data = ctx.data;

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <MetadataSection data={data.metadata} />
        <RuntimeClassHandlerSection data={data} />
      </Stack>
      {data.scheduling && <RuntimeClassSchedulingSection scheduling={data.scheduling} />}
    </Stack>
  );
};

RuntimeClassSidebar.displayName = 'RuntimeClassSidebar';
export default RuntimeClassSidebar;
