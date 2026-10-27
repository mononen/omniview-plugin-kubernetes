import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { EndpointSlice } from 'kubernetes-types/discovery/v1';
import React from 'react';

import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

import EndpointSliceInfoSection from './EndpointSliceInfoSection';
import SliceEndpointsSection from './SliceEndpointsSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<EndpointSlice>;
}

export const EndpointSliceSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) {
    return null;
  }

  const slice = ctx.data;
  const connectionID = ctx.resource?.connectionID || '';

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={slice.metadata} connectionID={ctx.resource?.connectionID} />
        <EndpointSliceInfoSection slice={slice} />
      </Stack>

      <SliceEndpointsSection endpoints={slice.endpoints ?? []} connectionID={connectionID} />
    </Stack>
  );
};

EndpointSliceSidebar.displayName = 'EndpointSliceSidebar';
export default EndpointSliceSidebar;
