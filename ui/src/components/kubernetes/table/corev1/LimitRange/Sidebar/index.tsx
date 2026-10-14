import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { LimitRange } from 'kubernetes-types/core/v1';
import React from 'react';

import LimitRangeItemSection from '../../../../../shared/LimitRangeItemSection';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<LimitRange>;
}

export const LimitRangeSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const lr = ctx.data;
  const limits = lr.spec?.limits as Array<{
    type?: string;
    default?: Record<string, string>;
    defaultRequest?: Record<string, string>;
    max?: Record<string, string>;
    min?: Record<string, string>;
    maxLimitRequestRatio?: Record<string, string>;
  }> | undefined;

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <ObjectMetaSection data={lr.metadata} />
      <LimitRangeItemSection limits={limits} />
    </Stack>
  );
};

LimitRangeSidebar.displayName = 'LimitRangeSidebar';
export default LimitRangeSidebar;
