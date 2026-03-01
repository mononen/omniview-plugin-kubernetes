import Box from '@mui/material/Box';
import { DrawerContext } from '@omniviewdev/runtime';
import { Chip } from '@omniviewdev/ui';
import { Stack } from '@omniviewdev/ui/layout';
import { Text } from '@omniviewdev/ui/typography';
import type { NetworkPolicy } from 'kubernetes-types/networking/v1';
import React from 'react';

import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

import NetworkPolicyRulesSection from './NetworkPolicyRulesSection';
import PolicyOverviewSection from './PolicyOverviewSection';

const denyAllSx = {
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  py: 0.75,
  px: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
} as const;

const chipSx = { borderRadius: 1 } as const;

interface Props {
  ctx: DrawerContext<NetworkPolicy>;
}

export const NetworkPolicySidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) {
    return null;
  }

  const policy = ctx.data;
  const spec = policy.spec;
  const policyTypes = spec?.policyTypes || [];

  // Deny-all detection:
  // When policyTypes includes a direction but the corresponding rules array is
  // empty or absent, it means all traffic in that direction is denied.
  const hasIngressType =
    policyTypes.includes('Ingress') || (policyTypes.length === 0 && spec != null);
  const hasEgressType = policyTypes.includes('Egress');

  const denyAllIngress = hasIngressType && (!spec?.ingress || spec.ingress.length === 0);
  const denyAllEgress = hasEgressType && (!spec?.egress || spec.egress.length === 0);

  return (
    <Stack direction="column" width={'100%'} spacing={2}>
      <Stack direction="column" spacing={0.5}>
        <ObjectMetaSection data={policy.metadata} />
        <PolicyOverviewSection policy={policy} />
      </Stack>

      {denyAllIngress && (
        <Box sx={denyAllSx}>
          <Text weight="semibold" size="sm">
            Ingress
          </Text>
          <Chip
            size="xs"
            emphasis="soft"
            color="danger"
            sx={chipSx}
            label="Deny All"
          />
        </Box>
      )}

      {spec?.ingress && spec.ingress.length > 0 && (
        <NetworkPolicyRulesSection direction="Ingress" rules={spec.ingress} />
      )}

      {denyAllEgress && (
        <Box sx={denyAllSx}>
          <Text weight="semibold" size="sm">
            Egress
          </Text>
          <Chip
            size="xs"
            emphasis="soft"
            color="danger"
            sx={chipSx}
            label="Deny All"
          />
        </Box>
      )}

      {spec?.egress && spec.egress.length > 0 && (
        <NetworkPolicyRulesSection direction="Egress" rules={spec.egress} />
      )}
    </Stack>
  );
};

NetworkPolicySidebar.displayName = 'NetworkPolicySidebar';
export default NetworkPolicySidebar;
