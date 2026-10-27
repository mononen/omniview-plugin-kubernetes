import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { MutatingWebhookConfiguration } from 'kubernetes-types/admissionregistration/v1';
import React from 'react';

import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import WebhookSection from '../../../../../shared/WebhookSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<MutatingWebhookConfiguration>;
}

export const MutatingWebhookConfigurationSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const mwc = ctx.data;

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <ObjectMetaSection data={mwc.metadata} connectionID={ctx.resource?.connectionID} />
      <WebhookSection webhooks={mwc.webhooks} />
    </Stack>
  );
};

MutatingWebhookConfigurationSidebar.displayName = 'MutatingWebhookConfigurationSidebar';
export default MutatingWebhookConfigurationSidebar;
