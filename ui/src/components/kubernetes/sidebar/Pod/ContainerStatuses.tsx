import { Chip, Grid, Text } from '@omniviewdev/base-ui';
import { formatRelative } from 'date-fns';
import {
  ContainerStateTerminated,
  ContainerStateWaiting,
  ContainerStatus,
} from 'kubernetes-types/core/v1';
import React from 'react';

import Icon from '../../../shared/Icon';
import SimpleTooltip from '../../../shared/SimpleTooltip';

import ContainerStatusCard from './ContainerStatusCard';
import { getStatus } from './utils';

const decoratorChipStyle: React.CSSProperties = {
  borderRadius: 'var(--ov-radius-sm)',
  paddingInline: 8,
};

/**
 * Details on a why a container was terminated
 */
export const ContainerTerminatedStatusInfo: React.FC<{
  state: ContainerStateTerminated;
}> = ({ state }) => {
  const info = {
    'Exit Code': state.exitCode,
    Signal: state.signal,
    Reason: state.reason,
    Started: state.startedAt ? formatRelative(new Date(state.startedAt), new Date()) : undefined,
    Finished: state.finishedAt ? formatRelative(new Date(state.finishedAt), new Date()) : undefined,
  };

  return (
    <Grid columns={12} spacing={0}>
      {Object.entries(info).map(([key, value]) =>
        value ? (
          <React.Fragment key={key}>
            <Grid.Item span={6}>
              <Text size="xs">{key}</Text>
            </Grid.Item>
            <Grid.Item span={6}>
              <Text size="xs">{value}</Text>
            </Grid.Item>
          </React.Fragment>
        ) : null,
      )}
      {state.message && (
        <Grid.Item span={12}>
          <Text size="xs">{state.message}</Text>
        </Grid.Item>
      )}
    </Grid>
  );
};

/**
 * Details on why a container is waiting
 */
export const ContainerWaitingStatusInfo: React.FC<{
  state: ContainerStateWaiting;
}> = ({ state }) => {
  const info = {
    Reason: state.reason,
    Message: state.message,
  };

  return (
    <Grid columns={12} spacing={0}>
      {Object.entries(info).map(
        ([key, value]) =>
          value && (
            <React.Fragment key={key}>
              <Grid.Item span={6}>
                <Text size="xs">{key}</Text>
              </Grid.Item>
              <Grid.Item span={6}>
                <Text size="xs">{value}</Text>
              </Grid.Item>
            </React.Fragment>
          ),
      )}
    </Grid>
  );
};

export const ContainerStatusDecorator: React.FC<{
  status: ContainerStatus;
}> = ({ status }) => {
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

  return (
    <SimpleTooltip
      key={statusInfo.text}
      placement="top"
      content={<ContainerStatusCard status={status} />}
    >
      <Chip
        size="sm"
        style={decoratorChipStyle}
        color={statusInfo.color}
        variant={getVariant()}
        startDecorator={statusInfo.icon && <Icon name={statusInfo.icon} size={16} />}
      >
        {statusInfo.text}
      </Chip>
    </SimpleTooltip>
  );
};
