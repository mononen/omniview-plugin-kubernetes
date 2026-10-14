import { Grid, Stack, Text } from '@omniviewdev/base-ui';
import type { Container } from 'kubernetes-types/core/v1';
import React from 'react';

import Icon from '../../../../shared/Icon';

import { formatCpu, formatMemory, parseCpuToMillicores, parseMemoryToBytes } from './helpers';
import {
  fontSize13Style,
  resourceBarBgStyle,
  resourceBarContainerStyle,
  resourceBarLabelStyle,
  resourceBarRowStyle,
  resourceBarTextStyle,
  resourceCardBodyStyle,
  resourceCardHeaderStyle,
  resourceCardStyle,
} from './styles';

// ── Resource utilization bar row ──
const ResourceBar: React.FC<{
  label: string;
  icon: string;
  displayValue: string;
  limit: string;
  usage?: number; // 0-100 percentage — future metrics integration
}> = ({ label, icon, displayValue, limit, usage }) => {
  const barColor =
    usage != null
      ? usage > 80
        ? 'var(--ov-color-danger)'
        : usage > 60
          ? 'var(--ov-color-warning)'
          : 'var(--ov-color-success)'
      : 'var(--ov-color-brand-500)';

  return (
    <Stack direction="row" spacing={3} align="center" style={resourceBarRowStyle}>
      <Stack direction="row" spacing={0} align="center" style={resourceBarLabelStyle}>
        <Icon name={icon} size={14} />
        <Text style={fontSize13Style}>{label}</Text>
      </Stack>
      <div style={resourceBarContainerStyle}>
        <div style={resourceBarBgStyle}>
          {usage != null && (
            <div
              style={{
                width: `${Math.min(usage, 100)}%`,
                height: '100%',
                borderRadius: 5,
                backgroundColor: barColor,
                transition: 'width 0.3s ease',
              }}
            />
          )}
        </div>
      </div>
      <Text tone="muted" style={resourceBarTextStyle} truncate>
        {displayValue} / {limit}
      </Text>
    </Stack>
  );
};

export interface ContainerResourcesSectionProps {
  container: Container;
  podCpuUsage?: number;
  podMemoryUsage?: number;
}

const ContainerResourcesSection: React.FC<ContainerResourcesSectionProps> = ({
  container,
  podCpuUsage,
  podMemoryUsage,
}) => {
  // ── Resource values ──
  const cpuReq = container.resources?.requests?.cpu;
  const cpuLim = container.resources?.limits?.cpu;
  const memReq = container.resources?.requests?.memory;
  const memLim = container.resources?.limits?.memory;
  const storReq = container.resources?.requests?.['ephemeral-storage'];
  const storLim = container.resources?.limits?.['ephemeral-storage'];

  // ── Compute usage percentages from pod-level metrics ──
  const cpuDenomStr = cpuReq || cpuLim;
  const cpuDenom = cpuDenomStr != null ? parseCpuToMillicores(cpuDenomStr) : undefined;
  const cpuUsagePercent =
    podCpuUsage != null && cpuDenom != null && Number.isFinite(cpuDenom) && cpuDenom > 0
      ? (podCpuUsage / cpuDenom) * 100
      : undefined;

  const memDenomStr = memReq || memLim;
  const memDenom = memDenomStr != null ? parseMemoryToBytes(memDenomStr) : undefined;
  const memUsagePercent =
    podMemoryUsage != null && memDenom != null && Number.isFinite(memDenom) && memDenom > 0
      ? (podMemoryUsage / memDenom) * 100
      : undefined;

  // Format usage display strings
  const cpuUsageDisplay = podCpuUsage != null ? formatCpu(podCpuUsage) : undefined;
  const memUsageDisplay = podMemoryUsage != null ? formatMemory(podMemoryUsage) : undefined;

  return (
    <Grid.Item span={12}>
      <div style={resourceCardStyle}>
        <div style={resourceCardHeaderStyle}>
          <Stack direction="row" spacing={1} align="center">
            <Icon name="LuGauge" size={14} />
            <Text style={fontSize13Style} weight="semibold">
              Resources
            </Text>
          </Stack>
        </div>
        <div style={resourceCardBodyStyle}>
          <ResourceBar
            label="CPU"
            icon="LuCpu"
            displayValue={
              cpuUsageDisplay ? `${cpuUsageDisplay} / ${cpuReq || '\u221E'}` : cpuReq || 'None'
            }
            limit={cpuLim || 'None'}
            usage={cpuUsagePercent}
          />
          <ResourceBar
            label="Memory"
            icon="LuMemoryStick"
            displayValue={
              memUsageDisplay ? `${memUsageDisplay} / ${memReq || '\u221E'}` : memReq || 'None'
            }
            limit={memLim || 'None'}
            usage={memUsagePercent}
          />
          <ResourceBar
            label="Storage"
            icon="LuHardDrive"
            displayValue={storReq || 'None'}
            limit={storLim || 'None'}
          />
        </div>
      </div>
    </Grid.Item>
  );
};

export default ContainerResourcesSection;
