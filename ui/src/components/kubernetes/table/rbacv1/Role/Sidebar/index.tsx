import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { Role } from 'kubernetes-types/rbac/v1';
import React from 'react';

import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import RBACRulesSection from '../../../../../shared/RBACRulesSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<Role>;
}

export const RoleSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const role = ctx.data;

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <ObjectMetaSection data={role.metadata} connectionID={ctx.resource?.connectionID} />
      <RBACRulesSection rules={role.rules} />
    </Stack>
  );
};

RoleSidebar.displayName = 'RoleSidebar';
export default RoleSidebar;
