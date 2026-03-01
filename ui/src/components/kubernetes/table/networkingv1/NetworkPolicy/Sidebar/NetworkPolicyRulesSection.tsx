import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { Chip, ClipboardText } from '@omniviewdev/ui';
import { Stack } from '@omniviewdev/ui/layout';
import { Text } from '@omniviewdev/ui/typography';
import type {
  NetworkPolicyIngressRule,
  NetworkPolicyEgressRule,
  NetworkPolicyPeer,
  NetworkPolicyPort,
} from 'kubernetes-types/networking/v1';
import React from 'react';

import ExpandableSections from '../../../../../shared/ExpandableSections';
import type { ExpandableSection } from '../../../../../shared/ExpandableSections';

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
  gap: 1,
} as const;

const chipSx = { borderRadius: 1 } as const;

const subLabelSx = {
  color: 'neutral.400',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  mb: 0.25,
} as const;

const ruleContentSx = {
  py: 0.5,
  px: 1,
} as const;

const cidrValueSx = {
  fontWeight: 600,
  fontSize: 11,
  fontFamily: 'var(--ov-font-mono, monospace)',
} as const;

const PeerDisplay: React.FC<{ peer: NetworkPolicyPeer; index: number }> = ({ peer, index }) => (
  <Stack direction="column" gap={0.5} sx={{ py: 0.25 }}>
    {peer.podSelector && (
      <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
        <Text size="xs" sx={{ color: 'neutral.400', fontSize: 10 }}>
          pods:
        </Text>
        {peer.podSelector.matchLabels &&
        Object.keys(peer.podSelector.matchLabels).length > 0 ? (
          Object.entries(peer.podSelector.matchLabels).map(([k, v]) => (
            <Chip
              key={`${index}-pod-${k}`}
              size="xs"
              emphasis="soft"
              color="primary"
              sx={{ ...chipSx, fontSize: 10, fontFamily: 'var(--ov-font-mono, monospace)' }}
              label={`${k}=${v}`}
            />
          ))
        ) : (
          <Chip size="xs" emphasis="outline" color="neutral" sx={chipSx} label="All" />
        )}
      </Stack>
    )}
    {peer.namespaceSelector && (
      <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
        <Text size="xs" sx={{ color: 'neutral.400', fontSize: 10 }}>
          namespaces:
        </Text>
        {peer.namespaceSelector.matchLabels &&
        Object.keys(peer.namespaceSelector.matchLabels).length > 0 ? (
          Object.entries(peer.namespaceSelector.matchLabels).map(([k, v]) => (
            <Chip
              key={`${index}-ns-${k}`}
              size="xs"
              emphasis="soft"
              color="info"
              sx={{ ...chipSx, fontSize: 10, fontFamily: 'var(--ov-font-mono, monospace)' }}
              label={`${k}=${v}`}
            />
          ))
        ) : (
          <Chip size="xs" emphasis="outline" color="neutral" sx={chipSx} label="All" />
        )}
      </Stack>
    )}
    {peer.ipBlock && (
      <Stack direction="column" gap={0.25}>
        <Stack direction="row" gap={0.5} alignItems="center">
          <Text size="xs" sx={{ color: 'neutral.400', fontSize: 10 }}>
            CIDR:
          </Text>
          <ClipboardText value={peer.ipBlock.cidr} variant="inherit" sx={cidrValueSx} />
        </Stack>
        {peer.ipBlock.except && peer.ipBlock.except.length > 0 && (
          <Stack direction="row" gap={0.5} alignItems="center" flexWrap="wrap">
            <Text size="xs" sx={{ color: 'neutral.400', fontSize: 10 }}>
              except:
            </Text>
            {peer.ipBlock.except.map((cidr) => (
              <ClipboardText key={cidr} value={cidr} variant="inherit" sx={cidrValueSx} />
            ))}
          </Stack>
        )}
      </Stack>
    )}
  </Stack>
);

const PortsDisplay: React.FC<{ ports: NetworkPolicyPort[] }> = ({ ports }) => (
  <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
    {ports.map((p, i) => {
      const portStr = p.port != null
        ? p.endPort
          ? `${p.port}-${p.endPort}`
          : String(p.port)
        : '*';
      return (
        <Chip
          key={`${p.protocol}-${p.port}-${i}`}
          size="xs"
          emphasis="outline"
          color="neutral"
          sx={{ ...chipSx, fontSize: 10, fontFamily: 'var(--ov-font-mono, monospace)' }}
          label={`${p.protocol || 'TCP'}/${portStr}`}
        />
      );
    })}
  </Stack>
);

interface Props {
  direction: 'Ingress' | 'Egress';
  rules?: NetworkPolicyIngressRule[] | NetworkPolicyEgressRule[];
}

const NetworkPolicyRulesSection: React.FC<Props> = ({ direction, rules }) => {
  if (!rules || rules.length === 0) return null;

  const sections: ExpandableSection[] = rules.map((rule, idx) => {
    const peers =
      direction === 'Ingress'
        ? (rule as NetworkPolicyIngressRule).from
        : (rule as NetworkPolicyEgressRule).to;
    const ports = rule.ports;

    return {
      title: (
        <Stack direction="row" gap={0.75} alignItems="center">
          <Text weight="semibold" size="xs" sx={{ fontSize: 12 }}>
            Rule {idx + 1}
          </Text>
          {!peers && !ports && (
            <Chip size="xs" emphasis="soft" color="success" sx={chipSx} label="Allow All" />
          )}
        </Stack>
      ),
      defaultExpanded: rules.length <= 3,
      children: (
        <Box sx={ruleContentSx}>
          {peers && peers.length > 0 && (
            <Box sx={{ mb: 0.5 }}>
              <Text size="xs" weight="semibold" sx={subLabelSx}>
                {direction === 'Ingress' ? 'From' : 'To'}
              </Text>
              {peers.map((peer, i) => (
                <PeerDisplay key={i} peer={peer} index={i} />
              ))}
            </Box>
          )}
          {ports && ports.length > 0 && (
            <Box>
              <Text size="xs" weight="semibold" sx={subLabelSx}>
                Ports
              </Text>
              <PortsDisplay ports={ports} />
            </Box>
          )}
        </Box>
      ),
    };
  });

  return (
    <Box sx={sectionBorderSx}>
      <Box sx={headerSx}>
        <Text weight="semibold" size="sm">
          {direction} Rules
        </Text>
        <Chip
          size="xs"
          emphasis="outline"
          color={direction === 'Ingress' ? 'primary' : 'warning'}
          sx={chipSx}
          label={String(rules.length)}
        />
      </Box>
      <Divider />
      <ExpandableSections sections={sections} size="sm" variant="flush" />
    </Box>
  );
};

export default NetworkPolicyRulesSection;
