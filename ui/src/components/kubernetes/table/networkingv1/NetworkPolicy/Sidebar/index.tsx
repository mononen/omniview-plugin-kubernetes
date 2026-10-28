import { Chip, Stack, Text } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { NetworkPolicy } from 'kubernetes-types/networking/v1';
import React from 'react';

import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

import NetworkPolicyRulesSection from './NetworkPolicyRulesSection';
import PolicyOverviewSection from './PolicyOverviewSection';

const fullWidthStyle = { width: '100%' } as const;

const denyAllStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid', borderColor: 'var(--ov-color-border-default)', paddingBlock: 6, paddingInline: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

const chipStyle = { borderRadius: 4 } as const;

const DenyAllBanner: React.FC<{ direction: 'Ingress' | 'Egress' }> = ({ direction }) => (
  <div style={denyAllStyle}>
    <Text weight="semibold" size="sm">
      {direction}
    </Text>
    <Chip size="xs" color="danger" style={chipStyle}>Deny All</Chip>
  </div>
);

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
  // Per K8s spec: when policyTypes is empty, Ingress is always implied,
  // and Egress is implied when spec.egress is defined.
  const hasIngressType =
    policyTypes.includes('Ingress') || (policyTypes.length === 0 && spec != null);
  const hasEgressType =
    policyTypes.includes('Egress') ||
    (policyTypes.length === 0 && spec?.egress !== undefined);

  const denyAllIngress = hasIngressType && (!spec?.ingress || spec.ingress.length === 0);
  const denyAllEgress = hasEgressType && (!spec?.egress || spec.egress.length === 0);

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={policy.metadata} connectionID={ctx.resource?.route.connection} />
        <PolicyOverviewSection policy={policy} />
      </Stack>

      {denyAllIngress && <DenyAllBanner direction="Ingress" />}

      {spec?.ingress && spec.ingress.length > 0 && (
        <NetworkPolicyRulesSection direction="Ingress" rules={spec.ingress} />
      )}

      {denyAllEgress && <DenyAllBanner direction="Egress" />}

      {spec?.egress && spec.egress.length > 0 && (
        <NetworkPolicyRulesSection direction="Egress" rules={spec.egress} />
      )}
    </Stack>
  );
};

NetworkPolicySidebar.displayName = 'NetworkPolicySidebar';
export default NetworkPolicySidebar;
