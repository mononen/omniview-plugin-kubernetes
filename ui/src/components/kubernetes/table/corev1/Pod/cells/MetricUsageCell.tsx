import { Stack, Text } from '@omniviewdev/base-ui';
import React, { createContext, useContext } from 'react';

import type { PodMetricsMap } from '../../../../../../hooks/usePodMetricsBatch';

const emptyValueStyle = {
  fontSize: 12,
  color: 'var(--ov-color-fg-subtle)',
  fontVariantNumeric: 'tabular-nums',
} as const;

const outerStackStyle = { width: '100%' } as const;

const barTrackStyle = {
  flex: 1,
  minWidth: 24,
  maxWidth: 40,
  height: 6,
  borderRadius: 3,
  background: 'var(--ov-color-state-hover)',
  overflow: 'hidden',
  flexShrink: 0,
} as const;

const valueLabelStyle = {
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  fontFamily: 'var(--ov-font-mono, monospace)',
  lineHeight: 1,
} as const;

// ── Context for passing batch metrics to table cells ──

export const PodMetricsContext = createContext<PodMetricsMap>(new Map());

// ── Formatters ──

function formatCpu(millicores: number): string {
  if (millicores >= 1000) return `${(millicores / 1000).toFixed(1)}`;
  if (millicores >= 10) return `${Math.round(millicores)}m`;
  return `${millicores.toFixed(1)}m`;
}

function formatMemory(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}Gi`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}Mi`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}Ki`;
  return `${bytes}B`;
}

// ── Cell Component ──

interface MetricUsageCellProps {
  podKey: string; // "namespace/podName"
  format: 'cpu' | 'memory';
}

/**
 * Compact metric cell with a mini usage bar and text label.
 * Reads pod metrics from PodMetricsContext.
 */
const MetricUsageCell: React.FC<MetricUsageCellProps> = ({ podKey, format }) => {
  const metricsMap = useContext(PodMetricsContext);
  const entry = metricsMap.get(podKey);

  if (!entry) {
    return (
      <Text style={emptyValueStyle}>—</Text>
    );
  }

  const raw = format === 'cpu' ? entry.cpuMillicores : entry.memoryBytes;
  const label = format === 'cpu' ? formatCpu(raw) : formatMemory(raw);

  // Estimate a percentage for the bar. Without per-pod limits available in the
  // table row we use a soft heuristic: CPU caps at 1000m (1 core),
  // memory caps at 512Mi. The bar is purely visual — the text is the truth.
  const pct =
    format === 'cpu'
      ? Math.min((raw / 1000) * 100, 100)
      : Math.min((raw / (512 * 1024 * 1024)) * 100, 100);

  const barColor =
    pct > 80
      ? 'var(--ov-color-danger)'
      : pct > 60
        ? 'var(--ov-color-warning)'
        : 'var(--ov-color-success)';

  return (
    <Stack direction="row" spacing={1} align="center" style={outerStackStyle}>
      {/* Mini bar */}
      <div style={barTrackStyle}>
        <div
          style={{
            width: `${Math.max(pct, 2)}%`,
            height: '100%',
            borderRadius: 3,
            background: barColor,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      {/* Value text */}
      <Text truncate style={valueLabelStyle}>
        {label}
      </Text>
    </Stack>
  );
};

export default MetricUsageCell;
