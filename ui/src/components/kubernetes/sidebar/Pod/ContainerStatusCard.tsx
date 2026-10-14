import { Card, Chip, Separator, Stack, Text } from '@omniviewdev/base-ui';
import { formatRelative } from 'date-fns';
import { ContainerStatus } from 'kubernetes-types/core/v1';
import * as React from 'react';

import Icon from '../../../shared/Icon';

import { ContainerTerminatedStatusInfo, ContainerWaitingStatusInfo } from './ContainerStatuses';
import { getStatus } from './utils';

const cardStyle: React.CSSProperties = { padding: 4, minWidth: 300 };
const statusChipStyle: React.CSSProperties = { borderRadius: 'var(--ov-radius-sm)' };
const lastStateCardStyle: React.CSSProperties = {
  paddingInline: 8,
  paddingTop: 4,
  paddingBottom: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};
const lastStateLabelStyle: React.CSSProperties = { fontSize: 12 };

interface Props {
  status: ContainerStatus;
  showContainerName?: boolean;
  showStartedAt?: boolean;
}

const ContainerStatusCard: React.FC<Props> = ({
  status,
  showContainerName = true,
  showStartedAt = true,
}) => {
  const statusInfo = getStatus(status);

  const getVariant = (): 'outline' | 'soft' | 'solid' => {
    switch (statusInfo.text) {
      case 'Completed':
        return 'outline';
      case 'Waiting':
        return 'soft';
      default:
        return 'solid';
    }
  };

  const getStatusText = () => {
    if (status.ready && status.started) {
      return 'Ready';
    } else if (!status.ready && status.started) {
      return 'Started';
    }
    return 'Not Ready';
  };

  return (
    <Card variant="soft" style={cardStyle}>
      <Stack direction="row" align="center" justify="between" spacing={4}>
        {showContainerName && <Text size="sm">{status.name}</Text>}
        <Stack spacing={2} direction="row" align="center">
          <Chip
            size="sm"
            color={statusInfo.color}
            variant={getVariant()}
            style={statusChipStyle}
            startDecorator={statusInfo.icon && <Icon name={statusInfo.icon} size={16} />}
          >
            {statusInfo.text}
          </Chip>
          <Chip
            size="sm"
            color={status.ready ? 'brand' : 'info'}
            variant="outline"
            style={statusChipStyle}
          >
            {getStatusText()}
          </Chip>
        </Stack>
        {showStartedAt && status.state?.running && status.state.running.startedAt && (
          <Text size="sm">
            Started {formatRelative(new Date(status.state.running.startedAt), new Date())}
          </Text>
        )}
      </Stack>
      <div>
        <Stack direction="column" spacing={0}>
          {status.state?.terminated && (
            <ContainerTerminatedStatusInfo state={status.state.terminated} />
          )}
          {status.state?.waiting && <ContainerWaitingStatusInfo state={status.state.waiting} />}
          {status.state?.running && !status.lastState?.terminated && (
            <Text size="sm" tone="success">
              Container is healthy
            </Text>
          )}
          {status.lastState?.terminated && (
            <Card variant="outline" style={lastStateCardStyle}>
              <Stack direction="row" spacing={2} align="center" justify="between">
                <Text style={lastStateLabelStyle}>Last State</Text>
                <Chip size="sm" color="danger" variant="outline" style={statusChipStyle}>
                  Terminated
                </Chip>
              </Stack>
              <Separator />
              <div>
                <ContainerTerminatedStatusInfo state={status.lastState.terminated} />
              </div>
            </Card>
          )}
        </Stack>
      </div>
    </Card>
  );
};

export default ContainerStatusCard;
