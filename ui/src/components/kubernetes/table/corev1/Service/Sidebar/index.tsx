import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import { DrawerContext } from '@omniviewdev/runtime';
import { ClipboardText } from '@omniviewdev/ui';
import { Stack } from '@omniviewdev/ui/layout';
import { Text } from '@omniviewdev/ui/typography';
import type { Service } from 'kubernetes-types/core/v1';
import React from 'react';

import KVCard from '../../../../../shared/KVCard';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

import ServicePortsSection from './ServicePortsSection';
import ServiceStatusSection from './ServiceStatusSection';

const sectionBorderSx = {
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
} as const;

const titleAreaSx = { py: 0.5, px: 1 } as const;

const contentAreaSx = { py: 0.5, px: 1, bgcolor: 'background.level1' } as const;

const entryGridSx = { minHeight: 22, alignItems: 'center' } as const;
const entryLabelSx = { color: 'neutral.300' } as const;
const entryValueSx = { fontWeight: 600, fontSize: 12 } as const;

interface Props {
  ctx: DrawerContext<Service>;
}

const ConfigEntry: React.FC<{
  label: string;
  value?: string | React.ReactNode;
}> = ({ label, value }) => {
  if (value === undefined || value === null) return null;
  return (
    <Grid container spacing={0} sx={entryGridSx}>
      <Grid size={4}>
        <Text sx={entryLabelSx} size="xs">
          {label}
        </Text>
      </Grid>
      <Grid size={8}>
        {typeof value === 'string' ? (
          <ClipboardText value={value} variant="inherit" sx={entryValueSx} />
        ) : (
          value
        )}
      </Grid>
    </Grid>
  );
};

export const ServiceSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) {
    return null;
  }

  const svc = ctx.data;
  const spec = svc.spec;
  const connectionID = ctx.resource?.connectionID || '';
  const selector = spec?.selector as Record<string, string> | undefined;

  const hasConfig =
    spec?.sessionAffinity ||
    spec?.ipFamilyPolicy ||
    spec?.internalTrafficPolicy ||
    spec?.externalTrafficPolicy;

  return (
    <Stack direction="column" width={'100%'} spacing={2}>
      <Stack direction="column" spacing={0.5}>
        <ObjectMetaSection data={svc.metadata} />
        <ServiceStatusSection service={svc} connectionID={connectionID} />

        {hasConfig && (
          <Box sx={sectionBorderSx}>
            <Box sx={titleAreaSx}>
              <Text weight="semibold" size="sm">
                Configuration
              </Text>
            </Box>
            <Divider />
            <Box sx={contentAreaSx}>
              <ConfigEntry
                label="Session Affinity"
                value={spec?.sessionAffinity || 'None'}
              />
              {spec?.ipFamilyPolicy && (
                <ConfigEntry label="IP Family Policy" value={spec.ipFamilyPolicy} />
              )}
              {spec?.ipFamilies && spec.ipFamilies.length > 0 && (
                <ConfigEntry label="IP Families" value={spec.ipFamilies.join(', ')} />
              )}
              {spec?.internalTrafficPolicy && (
                <ConfigEntry label="Internal Traffic" value={spec.internalTrafficPolicy} />
              )}
              {spec?.externalTrafficPolicy && (
                <ConfigEntry label="External Traffic" value={spec.externalTrafficPolicy} />
              )}
            </Box>
          </Box>
        )}
      </Stack>

      {selector && Object.keys(selector).length > 0 && (
        <KVCard title="Selector" kvs={selector} defaultExpanded />
      )}

      <ServicePortsSection
        service={svc}
        connectionID={connectionID}
        resourceID={ctx.resource?.id || ''}
      />
    </Stack>
  );
};

ServiceSidebar.displayName = 'ServiceSidebar';
export default ServiceSidebar;
