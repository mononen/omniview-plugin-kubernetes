import { DrawerContext } from '@omniviewdev/runtime';
import { Stack } from '@omniviewdev/ui/layout';
import type { Endpoints } from 'kubernetes-types/core/v1';
import React from 'react';

import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

import EndpointSubsetsSection from './EndpointSubsetsSection';

interface Props {
  ctx: DrawerContext<Endpoints>;
}

export const EndpointsSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) {
    return null;
  }

  const endpoints = ctx.data;
  const connectionID = ctx.resource?.connectionID || '';

  return (
    <Stack direction="column" width={'100%'} spacing={2}>
      <ObjectMetaSection data={endpoints.metadata} />
      <EndpointSubsetsSection subsets={endpoints.subsets} connectionID={connectionID} />
    </Stack>
  );
};

EndpointsSidebar.displayName = 'EndpointsSidebar';
export default EndpointsSidebar;
