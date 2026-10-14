import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { ValidatingWebhookConfiguration } from 'kubernetes-types/admissionregistration/v1';
import React from 'react';

import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import WebhookSection from '../../../../../shared/WebhookSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<ValidatingWebhookConfiguration>;
}

export const ValidatingWebhookConfigurationSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const vwc = ctx.data;

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <ObjectMetaSection data={vwc.metadata} />
      <WebhookSection webhooks={vwc.webhooks} />
    </Stack>
  );
};

ValidatingWebhookConfigurationSidebar.displayName = 'ValidatingWebhookConfigurationSidebar';
export default ValidatingWebhookConfigurationSidebar;
