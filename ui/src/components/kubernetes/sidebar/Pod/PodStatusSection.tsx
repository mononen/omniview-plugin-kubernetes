import { Chip, ClipboardText, Grid, Separator, Stack, Text } from '@omniviewdev/base-ui';
import { formatRelative } from 'date-fns';
import type { Pod } from 'kubernetes-types/core/v1';
import { Condition } from 'kubernetes-types/meta/v1';
import React from 'react';

import ConditionChip from '../../../shared/ConditionChip';
import ResourceLinkChip from '../../../shared/ResourceLinkChip';
import {
  entryRowStyle,
  entryValueStyle,
  roundedChipStyle,
  sectionBodyStyle,
  sectionBorderStyle,
  sectionHeaderStyle,
} from '../shared/sectionStyles';

interface Props {
  pod: Pod;
  /** When provided, the Node chip becomes clickable and opens the Node sidebar */
  connectionID?: string;
}

const phaseColor = (phase?: string): 'success' | 'warning' | 'brand' | 'danger' | 'neutral' | 'info' => {
  switch (phase) {
    case 'Running':
      return 'success';
    case 'Pending':
      return 'info';
    case 'Succeeded':
      return 'brand';
    case 'Failed':
      return 'danger';
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
    <Grid columns={12} spacing={0} style={entryRowStyle}>
      <Grid.Item span={3}>
        <Text tone="muted" size="xs">
          {label}
        </Text>
      </Grid.Item>
      <Grid.Item span={9}>
        {typeof value === 'string' ? (
          <ClipboardText value={value} style={entryValueStyle} />
        ) : (
          value
        )}
      </Grid.Item>
    </Grid>
  );
};

const PodStatusSection: React.FC<Props> = ({ pod, connectionID }) => {
  const phase = pod.status?.phase;
  const qosClass = pod.status?.qosClass;
  const podIP = pod.status?.podIP;
  const hostIP = pod.status?.hostIP;
  const nodeName = pod.spec?.nodeName;
  const startTime = pod.status?.startTime;
  const conditions = pod.status?.conditions;

  const totalRestarts =
    (pod.status?.containerStatuses?.reduce((sum, cs) => sum + (cs.restartCount || 0), 0) ?? 0) +
    (pod.status?.initContainerStatuses?.reduce((sum, cs) => sum + (cs.restartCount || 0), 0) ?? 0);

  return (
    <div style={sectionBorderStyle}>
      {/* Header: title + phase chip + conditions */}
      <div style={sectionHeaderStyle}>
        <Stack direction="row" spacing={0} align="center" style={{ gap: 6, flexShrink: 0 }}>
          <Text weight="semibold" size="sm">
            Status
          </Text>
          <Chip size="xs" color={phaseColor(phase)} variant="soft" style={roundedChipStyle}>
            {phase || 'Unknown'}
          </Chip>
        </Stack>
        {conditions && conditions.length > 0 && (
          <Stack direction="row" spacing={1} wrap justify="end">
            {conditions.map((condition) => (
              <ConditionChip key={condition.type} condition={condition as unknown as Condition} />
            ))}
          </Stack>
        )}
      </div>
      <Separator />
      <div style={sectionBodyStyle}>
        <StatusEntry label="QoS" value={qosClass} />
        <StatusEntry label="Pod IP" value={podIP} />
        <StatusEntry label="Host IP" value={hostIP} />
        <StatusEntry
          label="Node"
          value={
            nodeName ? (
              connectionID ? (
                <ResourceLinkChip
                  connectionID={connectionID}
                  resourceKey="k8s:/nodes"
                  resourceID={nodeName}
                  resourceName={nodeName}
                />
              ) : (
                <Chip size="xs" color="brand" variant="soft" style={roundedChipStyle}>
                  {nodeName}
                </Chip>
              )
            ) : undefined
          }
        />
        {totalRestarts > 0 && (
          <StatusEntry
            label="Restarts"
            value={
              <Chip
                size="xs"
                color={totalRestarts > 5 ? 'danger' : 'warning'}
                variant="soft"
                style={roundedChipStyle}
              >
                {String(totalRestarts)}
              </Chip>
            }
          />
        )}
        {startTime && (
          <StatusEntry label="Started" value={formatRelative(new Date(startTime), new Date())} />
        )}
      </div>
    </div>
  );
};

export default PodStatusSection;
