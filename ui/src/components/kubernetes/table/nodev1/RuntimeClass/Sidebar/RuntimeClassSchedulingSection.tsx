import { Chip, Stack, Text, Separator } from '@omniviewdev/base-ui';
import type { Toleration } from 'kubernetes-types/core/v1';
import type { Scheduling } from 'kubernetes-types/node/v1';
import React from 'react';

import KVCard from '../../../../../shared/KVCard';

const span4Style: React.CSSProperties = { gridColumn: 'span 4', minWidth: 0 };

const stackStyle1 = { gap: 6 } as const;

const tolerationGridStyle: React.CSSProperties = { minHeight: 24, alignItems: 'center', display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' };

const tolerationKeyStyle: React.CSSProperties = { fontWeight: 600, fontSize: 12 };

const tolerationSecondsStyle: React.CSSProperties = { color: 'var(--ov-color-fg-muted)' };

const sectionBorderStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid', borderColor: 'var(--ov-color-border-default)' };

const sectionHeaderStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8 };

interface Props {
  scheduling: Scheduling;
}

const effectColors: Record<string, 'brand' | 'warning' | 'danger' | 'neutral'> = {
  NoSchedule: 'warning',
  PreferNoSchedule: 'brand',
  NoExecute: 'danger',
};

const tolerationRowEvenStyle: React.CSSProperties = {
  paddingBlock: 4,
  paddingInline: 8,
  background: 'var(--ov-color-bg-surface-raised)',
};
const tolerationRowOddStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, background: 'transparent' };

const TolerationRow: React.FC<{ t: Toleration; index: number }> = ({ t, index }) => (
  <div
    style={index % 2 === 0 ? tolerationRowEvenStyle : tolerationRowOddStyle}
  >
    <div style={tolerationGridStyle}>
      <div style={span4Style}>
        <Text size="xs" style={tolerationKeyStyle} truncate>
          {t.key || '*'}
        </Text>
      </div>
      <div style={span4Style}>
        <Stack direction="row" spacing={1} align="center">
          <Chip size="sm" variant="outline">
            {t.operator === 'Exists' ? 'Exists' : `= ${t.value ?? ''}`}
          </Chip>
        </Stack>
      </div>
      <div style={span4Style}>
        <Stack direction="row" spacing={1} align="center">
          {t.effect && (
            <Chip size="sm" color={effectColors[t.effect] ?? 'neutral'}>
              {t.effect}
            </Chip>
          )}
          {t.tolerationSeconds != null && (
            <Text size="xs" style={tolerationSecondsStyle}>
              {t.tolerationSeconds}s
            </Text>
          )}
        </Stack>
      </div>
    </div>
  </div>
);

const RuntimeClassSchedulingSection: React.FC<Props> = ({ scheduling }) => {
  const nodeSelector = scheduling.nodeSelector;
  const tolerations = scheduling.tolerations;

  const hasNodeSelector = nodeSelector && Object.keys(nodeSelector).length > 0;
  const hasTolerations = tolerations && tolerations.length > 0;

  if (!hasNodeSelector && !hasTolerations) return null;

  return (
    <Stack direction="column" spacing={3}>
      {hasNodeSelector && (
        <KVCard title="Node Selector" kvs={nodeSelector} defaultExpanded size="sm" />
      )}

      {hasTolerations && (
        <div style={sectionBorderStyle}>
          <div style={sectionHeaderStyle}>
            <Stack direction="row" spacing={0} align="center" style={stackStyle1}>
              <Text weight="semibold" size="sm">
                Tolerations
              </Text>
              <Chip size="sm" variant="outline">
                {tolerations.length}
              </Chip>
            </Stack>
          </div>
          <Separator />
          {tolerations.map((t, i) => (
            <TolerationRow key={`${t.key}-${t.operator}-${t.value}-${t.effect}`} t={t} index={i} />
          ))}
        </div>
      )}
    </Stack>
  );
};

export default RuntimeClassSchedulingSection;
