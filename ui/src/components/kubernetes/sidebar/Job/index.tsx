import { DrawerContext } from '@omniviewdev/runtime';
import { Stack } from '@omniviewdev/base-ui';
import { Job } from 'kubernetes-types/batch/v1';
import React from 'react';

// types

// project-imports
import ObjectMetaSection from '../../../shared/ObjectMetaSection';

interface Props {
  ctx: DrawerContext<Job>;
}

/**
 * Renders a sidebar for a Job resource
 */
export const JobSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) {
    return null;
  }

  const obj = ctx.data;

  // compose your component here
  return (
    <Stack direction="column" spacing={4} style={{ width: '100%' }}>
      <ObjectMetaSection data={obj.metadata} connectionID={ctx.resource?.route.connection} />
    </Stack>
  );
};

JobSidebar.displayName = 'JobSidebar';
export default JobSidebar;
