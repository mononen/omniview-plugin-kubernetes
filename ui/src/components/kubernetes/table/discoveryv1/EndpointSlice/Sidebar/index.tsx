import { DrawerContext } from '@omniviewdev/runtime';
import { Stack } from '@omniviewdev/ui/layout';
import type { EndpointSlice } from 'kubernetes-types/discovery/v1';
import React from 'react';

import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

import EndpointSliceInfoSection from './EndpointSliceInfoSection';
import SliceEndpointsSection from './SliceEndpointsSection';

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
    <Stack direction="column" width={'100%'} spacing={2}>
      <Stack direction="column" spacing={0.5}>
        <ObjectMetaSection data={slice.metadata} />
        <EndpointSliceInfoSection slice={slice} />
      </Stack>

      <SliceEndpointsSection endpoints={slice.endpoints ?? []} connectionID={connectionID} />
    </Stack>
  );
};

EndpointSliceSidebar.displayName = 'EndpointSliceSidebar';
export default EndpointSliceSidebar;
