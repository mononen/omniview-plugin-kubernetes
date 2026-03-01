import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import { Chip, ClipboardText } from '@omniviewdev/ui';
import { Stack } from '@omniviewdev/ui/layout';
import { Text } from '@omniviewdev/ui/typography';
import type { Service } from 'kubernetes-types/core/v1';
import type { Condition } from 'kubernetes-types/meta/v1';
import React from 'react';

import ConditionChip from '../../../../../shared/ConditionChip';
import ResourceLinkChip from '../../../../../shared/ResourceLinkChip';

const sectionBorderSx = {
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
} as const;

const headerSx = {
  py: 0.5,
  px: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
} as const;

const bodyBgSx = {
  py: 0.5,
  px: 1,
  bgcolor: 'background.level1',
} as const;

const entryGridSx = { minHeight: 22, alignItems: 'center' } as const;
const entryLabelSx = { color: 'neutral.300' } as const;
const entryValueSx = { fontWeight: 600, fontSize: 12 } as const;
const chipSx = { borderRadius: 1 } as const;
const cidrValueSx = {
  fontWeight: 600,
  fontSize: 11,
  fontFamily: 'var(--ov-font-mono, monospace)',
} as const;

const typeColor = (
  type?: string,
): 'primary' | 'success' | 'warning' | 'info' | 'neutral' => {
  switch (type) {
    case 'ClusterIP':
      return 'primary';
    case 'NodePort':
      return 'warning';
    case 'LoadBalancer':
      return 'success';
    case 'ExternalName':
      return 'info';
    default:
      return 'neutral';
  }
};

const StatusEntry: React.FC<{
  label: string;
  value?: string | React.ReactNode;
}> = ({ label, value }) => {
  if (value === undefined || value === null) return null;
  return (
    <Grid container spacing={0} sx={entryGridSx}>
      <Grid size={3}>
        <Text sx={entryLabelSx} size="xs">
          {label}
        </Text>
      </Grid>
      <Grid size={9}>
        {typeof value === 'string' ? (
          <ClipboardText value={value} variant="inherit" sx={entryValueSx} />
        ) : (
          value
        )}
      </Grid>
    </Grid>
  );
};

interface Props {
  service: Service;
  connectionID?: string;
}

const ServiceStatusSection: React.FC<Props> = ({ service, connectionID }) => {
  const spec = service.spec;
  const svcType = spec?.type || 'ClusterIP';
  const clusterIP = spec?.clusterIP;
  const clusterIPs = spec?.clusterIPs;
  const externalIPs = spec?.externalIPs;
  const externalName = spec?.externalName;
  const lbIngress = service.status?.loadBalancer?.ingress;
  const conditions = service.status?.conditions;
  const lbSourceRanges = spec?.loadBalancerSourceRanges;
  const healthCheckNodePort = spec?.healthCheckNodePort;
  const svcName = service.metadata?.name;
  const svcNamespace = service.metadata?.namespace;

  return (
    <Box sx={sectionBorderSx}>
      {/* Header: title + type chip + conditions */}
      <Box sx={headerSx}>
        <Stack direction="row" gap={0.75} alignItems="center" flexShrink={0}>
          <Text weight="semibold" size="sm">
            Service
          </Text>
          <Chip
            size="xs"
            color={typeColor(svcType)}
            emphasis="soft"
            sx={chipSx}
            label={svcType}
          />
        </Stack>
        {conditions && conditions.length > 0 && (
          <Stack direction="row" gap={0.5} flexWrap="wrap" justifyContent="flex-end">
            {conditions.map((condition) => (
              <ConditionChip
                key={condition.type}
                condition={condition as unknown as Condition}
              />
            ))}
          </Stack>
        )}
      </Box>
      <Divider />
      <Box sx={bodyBgSx}>
        {clusterIP && clusterIP !== 'None' && (
          <StatusEntry label="Cluster IP" value={clusterIP} />
        )}
        {clusterIP === 'None' && (
          <StatusEntry
            label="Cluster IP"
            value={
              <Chip size="xs" emphasis="outline" color="neutral" sx={chipSx} label="None (Headless)" />
            }
          />
        )}
        {clusterIPs && clusterIPs.length > 1 && (
          <StatusEntry
            label="Cluster IPs"
            value={
              <Stack direction="row" gap={0.5} flexWrap="wrap">
                {clusterIPs.map((ip) => (
                  <ClipboardText key={ip} value={ip} variant="inherit" sx={entryValueSx} />
                ))}
              </Stack>
            }
          />
        )}
        {externalIPs && externalIPs.length > 0 && (
          <StatusEntry
            label="External IPs"
            value={
              <Stack direction="row" gap={0.5} flexWrap="wrap">
                {externalIPs.map((ip) => (
                  <ClipboardText key={ip} value={ip} variant="inherit" sx={entryValueSx} />
                ))}
              </Stack>
            }
          />
        )}
        {externalName && <StatusEntry label="External Name" value={externalName} />}
        {lbIngress && lbIngress.length > 0 &&
          lbIngress.map((ing, i) => (
            <React.Fragment key={ing.hostname || ing.ip || i}>
              {ing.hostname && (
                <StatusEntry label="LB Hostname" value={ing.hostname} />
              )}
              {ing.ip && <StatusEntry label="LB IP" value={ing.ip} />}
            </React.Fragment>
          ))}
        {lbSourceRanges && lbSourceRanges.length > 0 && (
          <StatusEntry
            label="LB Source Ranges"
            value={
              <Stack direction="row" gap={0.5} flexWrap="wrap">
                {lbSourceRanges.map((cidr) => (
                  <ClipboardText key={cidr} value={cidr} variant="inherit" sx={cidrValueSx} />
                ))}
              </Stack>
            }
          />
        )}
        {healthCheckNodePort != null && healthCheckNodePort > 0 && (
          <StatusEntry label="Health Check Port" value={String(healthCheckNodePort)} />
        )}

        {/* Endpoints link */}
        {connectionID && svcName && (
          <StatusEntry
            label="Endpoints"
            value={
              <ResourceLinkChip
                connectionID={connectionID}
                resourceKey="core::v1::Endpoints"
                resourceID={svcName}
                resourceName={svcName}
                namespace={svcNamespace}
              />
            }
          />
        )}
      </Box>
    </Box>
  );
};

export default ServiceStatusSection;
