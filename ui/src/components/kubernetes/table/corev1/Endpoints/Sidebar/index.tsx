import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { Endpoints } from 'kubernetes-types/core/v1';
import React from 'react';

import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

import EndpointSubsetsSection from './EndpointSubsetsSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<Endpoints>;
}

export const EndpointsSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) {
    return null;
  }

  const endpoints = ctx.data;
  const connectionID = ctx.resource?.route.connection || '';

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <ObjectMetaSection data={endpoints.metadata} connectionID={ctx.resource?.route.connection} />
      <EndpointSubsetsSection subsets={endpoints.subsets} connectionID={connectionID} />
    </Stack>
  );
};

EndpointsSidebar.displayName = 'EndpointsSidebar';
export default EndpointsSidebar;
