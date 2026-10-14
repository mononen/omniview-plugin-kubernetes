import { Chip, Stack, Text, Separator } from '@omniviewdev/base-ui';
import type { NetworkPolicy } from 'kubernetes-types/networking/v1';
import React from 'react';

const sectionBorderStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid', borderColor: 'var(--ov-color-border-default)' };

const headerStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };

const bodyBgStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, background: 'var(--ov-color-bg-surface-raised)' };

const chipStyle = { borderRadius: 4 } as const;
const subGroupTightStyle: React.CSSProperties = { marginBottom: 2 };
const monoChipStyle: React.CSSProperties = { ...chipStyle, fontFamily: 'var(--ov-font-mono, monospace)', fontSize: 10 };

const subLabelStyle: React.CSSProperties = { color: 'var(--ov-color-fg-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 };

interface Props {
  policy: NetworkPolicy;
}

const PolicyOverviewSection: React.FC<Props> = ({ policy }) => {
  const spec = policy.spec;
  if (!spec) return null;

  // When policyTypes is omitted, K8s implies Ingress is always active,
  // and Egress is active when egress rules are defined.
  let effectivePolicyTypes: string[];
  if (spec.policyTypes && spec.policyTypes.length > 0) {
    effectivePolicyTypes = spec.policyTypes;
  } else {
    effectivePolicyTypes = ['Ingress'];
    if (spec.egress && spec.egress.length > 0) {
      effectivePolicyTypes.push('Egress');
    }
  }
  const matchLabels = spec.podSelector.matchLabels;
  const matchExpressions = spec.podSelector.matchExpressions;
  const hasSelector =
    (matchLabels && Object.keys(matchLabels).length > 0) ||
    (matchExpressions && matchExpressions.length > 0);
  const isSelectAll = !hasSelector;

  return (
    <div style={sectionBorderStyle}>
      <div style={headerStyle}>
        <Text weight="semibold" size="sm">
          Policy Overview
        </Text>
        <Stack direction="row" spacing={1}>
          {effectivePolicyTypes.map((pt) => (
            <Chip key={pt} size="xs" color={pt === 'Ingress' ? 'brand' : 'warning'} style={chipStyle}>{pt}</Chip>
          ))}
        </Stack>
      </div>
      <Separator />
      <div style={bodyBgStyle}>
        <div style={subGroupTightStyle}>
          <Text size="xs" weight="semibold" style={subLabelStyle}>
            Pod Selector
          </Text>
        </div>
        {isSelectAll ? (
          <Chip size="xs" color="neutral" style={chipStyle} variant="outline">All Pods</Chip>
        ) : (
          <Stack direction="row" spacing={1} wrap>
            {matchLabels &&
              Object.entries(matchLabels).map(([k, v]) => (
                <Chip key={k} size="xs" color="neutral" style={monoChipStyle}>{`${k}=${v}`}</Chip>
              ))}
            {matchExpressions &&
              matchExpressions.map((expr, i) => (
                <Chip key={`${expr.key}|${expr.operator}|${expr.values?.join(',') ?? i}`} size="xs" color="neutral" style={monoChipStyle}>{`${expr.key} ${expr.operator} ${expr.values?.join(', ') || ''}`}</Chip>
              ))}
          </Stack>
        )}
      </div>
    </div>
  );
};

export default PolicyOverviewSection;
