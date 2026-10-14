import { Chip, ClipboardText, Stack, Text, Separator } from '@omniviewdev/base-ui';
import type {
  NetworkPolicyIngressRule,
  NetworkPolicyEgressRule,
  NetworkPolicyPeer,
  NetworkPolicyPort,
} from 'kubernetes-types/networking/v1';
import React from 'react';

import ExpandableSections from '../../../../../shared/ExpandableSections';
import type { ExpandableSection } from '../../../../../shared/ExpandableSections';

const stackStyle1 = { gap: 2 } as const;
const stackStyle2 = { gap: 6 } as const;

const sectionBorderStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid', borderColor: 'var(--ov-color-border-default)' };

const headerStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, display: 'flex', alignItems: 'center', gap: 8 };

const chipStyle = { borderRadius: 4 } as const;
const peerStackStyle: React.CSSProperties = { paddingBlock: 2 };
const tinyLabelStyle: React.CSSProperties = { fontSize: 10 };
const monoChipStyle: React.CSSProperties = { ...chipStyle, fontSize: 10, fontFamily: 'var(--ov-font-mono, monospace)' };
const titleTextStyle: React.CSSProperties = { fontSize: 12 };
const subGroupStyle: React.CSSProperties = { marginBottom: 4 };

const subLabelStyle: React.CSSProperties = { color: 'var(--ov-color-fg-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 };

const ruleContentStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8 };

const cidrValueStyle: React.CSSProperties = { fontWeight: 600, fontSize: 11, fontFamily: 'var(--ov-font-mono, monospace)' };

const PeerDisplay: React.FC<{ peer: NetworkPolicyPeer; index: number }> = ({ peer, index }) => (
  <Stack direction="column" spacing={1} style={peerStackStyle}>
    {peer.podSelector && (
      <Stack direction="row" spacing={1} wrap align="center">
        <Text size="xs" tone="muted" style={tinyLabelStyle}>
          pods:
        </Text>
        {peer.podSelector.matchLabels &&
        Object.keys(peer.podSelector.matchLabels).length > 0 ? (
          Object.entries(peer.podSelector.matchLabels).map(([k, v]) => (
            <Chip key={`${index}-pod-${k}`} size="xs" color="brand" style={monoChipStyle}>{`${k}=${v}`}</Chip>
          ))
        ) : (
          <Chip size="xs" color="neutral" style={chipStyle} variant="outline">All</Chip>
        )}
      </Stack>
    )}
    {peer.namespaceSelector && (
      <Stack direction="row" spacing={1} wrap align="center">
        <Text size="xs" tone="muted" style={tinyLabelStyle}>
          namespaces:
        </Text>
        {peer.namespaceSelector.matchLabels &&
        Object.keys(peer.namespaceSelector.matchLabels).length > 0 ? (
          Object.entries(peer.namespaceSelector.matchLabels).map(([k, v]) => (
            <Chip key={`${index}-ns-${k}`} size="xs" color="info" style={monoChipStyle}>{`${k}=${v}`}</Chip>
          ))
        ) : (
          <Chip size="xs" color="neutral" style={chipStyle} variant="outline">All</Chip>
        )}
      </Stack>
    )}
    {peer.ipBlock && (
      <Stack direction="column" spacing={0} style={stackStyle1}>
        <Stack direction="row" spacing={1} align="center">
          <Text size="xs" tone="muted" style={tinyLabelStyle}>
            CIDR:
          </Text>
          <ClipboardText value={peer.ipBlock.cidr} style={cidrValueStyle} />
        </Stack>
        {peer.ipBlock.except && peer.ipBlock.except.length > 0 && (
          <Stack direction="row" spacing={1} align="center" wrap>
            <Text size="xs" tone="muted" style={tinyLabelStyle}>
              except:
            </Text>
            {peer.ipBlock.except.map((cidr) => (
              <ClipboardText key={cidr} value={cidr} style={cidrValueStyle} />
            ))}
          </Stack>
        )}
      </Stack>
    )}
  </Stack>
);

const PortsDisplay: React.FC<{ ports: NetworkPolicyPort[] }> = ({ ports }) => (
  <Stack direction="row" spacing={1} wrap align="center">
    {ports.map((p, i) => {
      const portStr = p.port != null
        ? p.endPort
          ? `${p.port}-${p.endPort}`
          : String(p.port)
        : '*';
      return (
        <Chip key={`${p.protocol}-${p.port}-${i}`} size="xs" color="neutral" style={monoChipStyle} variant="outline">{`${p.protocol || 'TCP'}/${portStr}`}</Chip>
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
        <Stack direction="row" spacing={0} align="center" style={stackStyle2}>
          <Text weight="semibold" size="xs" style={titleTextStyle}>
            Rule {idx + 1}
          </Text>
          {!peers && !ports && (
            <Chip size="xs" color="success" style={chipStyle}>Allow All</Chip>
          )}
        </Stack>
      ),
      defaultExpanded: rules.length <= 3,
      children: (
        <div style={ruleContentStyle}>
          {peers && peers.length > 0 && (
            <div style={subGroupStyle}>
              <Text size="xs" weight="semibold" style={subLabelStyle}>
                {direction === 'Ingress' ? 'From' : 'To'}
              </Text>
              {peers.map((peer, i) => (
                <PeerDisplay key={i} peer={peer} index={i} />
              ))}
            </div>
          )}
          {ports && ports.length > 0 && (
            <div>
              <Text size="xs" weight="semibold" style={subLabelStyle}>
                Ports
              </Text>
              <PortsDisplay ports={ports} />
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <div style={sectionBorderStyle}>
      <div style={headerStyle}>
        <Text weight="semibold" size="sm">
          {direction} Rules
        </Text>
        <Chip size="xs" color={direction === 'Ingress' ? 'brand' : 'warning'} style={chipStyle} variant="outline">{String(rules.length)}</Chip>
      </div>
      <Separator />
      <ExpandableSections sections={sections} size="sm" variant="flush" />
    </div>
  );
};

export default NetworkPolicyRulesSection;
