import { Progress, Separator, Stack, Text } from '@omniviewdev/base-ui';
import type { Node } from 'kubernetes-types/core/v1';
import React from 'react';

import { convertKubernetesByteUnits } from '../../../../utils/convert';
import { sectionBodyStyle, sectionBorderStyle, sectionTitleStyle } from '../shared/sectionStyles';

const resourceRowStyle: React.CSSProperties = { paddingBlock: 2 };
const resourceLabelStyle: React.CSSProperties = { fontWeight: 600, minWidth: 60 };
const usageBarRowStyle: React.CSSProperties = { marginTop: 2 };
const progressBarStyle: React.CSSProperties = { flex: 1, height: 6, borderRadius: 3 };
const usageTextStyle: React.CSSProperties = { minWidth: 44, textAlign: 'right' };

interface Props {
  node: Node;
  /** CPU usage in millicores (from metrics) */
  cpuUsage?: number;
  /** CPU capacity in millicores */
  cpuCapacity?: number;
  /** Memory usage in bytes (from metrics) */
  memoryUsage?: number;
  /** Memory capacity in bytes */
  memoryCapacity?: number;
}

const ResourceRow: React.FC<{
  label: string;
  capacity?: string;
  allocatable?: string;
  usage?: number; // 0..100 percent
  usageLabel?: string;
}> = ({ label, capacity, allocatable, usage, usageLabel }) => (
  <div style={resourceRowStyle}>
    <Stack direction="row" spacing={0} justify="between" align="center">
      <Text size="xs" style={resourceLabelStyle}>
        {label}
      </Text>
      <Stack direction="row" spacing={3} align="center">
        <Text size="xs" tone="muted">
          {allocatable ?? '-'} / {capacity ?? '-'}
        </Text>
      </Stack>
    </Stack>
    {usage != null && (
      <Stack direction="row" spacing={2} align="center" style={usageBarRowStyle}>
        <Progress
          value={Math.min(usage, 100)}
          size="xs"
          color={usage > 90 ? 'danger' : usage > 70 ? 'warning' : 'brand'}
          style={progressBarStyle}
        />
        <Text size="xs" tone="subtle" style={usageTextStyle}>
          {usageLabel || `${usage.toFixed(1)}%`}
        </Text>
      </Stack>
    )}
  </div>
);

/** Parse a Kubernetes CPU quantity like "4" or "4000m" to millicores. */
function cpuToMillicores(value?: string): number | undefined {
  if (!value) return undefined;
  if (value.endsWith('m')) return parseInt(value, 10);
  return parseFloat(value) * 1000;
}

/** Parse a Kubernetes memory quantity to bytes. */
function memoryToBytes(value?: string): number | undefined {
  if (!value) return undefined;
  const units: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    K: 1e3,
    M: 1e6,
    G: 1e9,
    T: 1e12,
  };
  for (const [suffix, factor] of Object.entries(units)) {
    if (value.endsWith(suffix)) {
      return parseFloat(value.replace(suffix, '')) * factor;
    }
  }
  return parseFloat(value);
}

const NodeResourcesSection: React.FC<Props> = ({
  node,
  cpuUsage,
  cpuCapacity: cpuCapacityOverride,
  memoryUsage,
  memoryCapacity: memoryCapacityOverride,
}) => {
  const capacity = node.status?.capacity;
  const allocatable = node.status?.allocatable;

  const cpuCap = cpuCapacityOverride ?? cpuToMillicores(capacity?.cpu);
  const memCap = memoryCapacityOverride ?? memoryToBytes(capacity?.memory);

  const cpuPercent = cpuUsage != null && cpuCap ? (cpuUsage / cpuCap) * 100 : undefined;
  const memPercent = memoryUsage != null && memCap ? (memoryUsage / memCap) * 100 : undefined;

  return (
    <div style={sectionBorderStyle}>
      <div style={sectionTitleStyle}>
        <Text weight="semibold" size="sm">
          Resources
        </Text>
      </div>
      <Separator />
      <div style={sectionBodyStyle}>
        <ResourceRow
          label="CPU"
          capacity={capacity?.cpu}
          allocatable={allocatable?.cpu}
          usage={cpuPercent}
          usageLabel={cpuUsage != null ? `${cpuUsage.toFixed(0)}m` : undefined}
        />
        <ResourceRow
          label="Memory"
          capacity={convertKubernetesByteUnits({ from: capacity?.memory || '', to: 'GB' })}
          allocatable={convertKubernetesByteUnits({ from: allocatable?.memory || '', to: 'GB' })}
          usage={memPercent}
          usageLabel={
            memoryUsage != null
              ? convertKubernetesByteUnits({ from: `${Math.round(memoryUsage)}B`, to: 'GB' })
              : undefined
          }
        />
        <ResourceRow
          label="Storage"
          capacity={convertKubernetesByteUnits({
            from: capacity?.['ephemeral-storage'] || '',
            to: 'GB',
          })}
          allocatable={convertKubernetesByteUnits({
            from: allocatable?.['ephemeral-storage'] || '',
            to: 'GB',
          })}
        />
        <ResourceRow label="Pods" capacity={capacity?.pods} allocatable={allocatable?.pods} />
      </div>
    </div>
  );
};

export default NodeResourcesSection;
