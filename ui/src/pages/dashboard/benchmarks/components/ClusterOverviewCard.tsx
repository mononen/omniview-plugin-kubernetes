import { Heading, Stack, Text } from '@omniviewdev/base-ui';
import * as React from 'react';

const cardWrapperStyle: React.CSSProperties = { padding: 4 };

const scoreBoxStyle: React.CSSProperties = {
  alignItems: 'center',
  justifyContent: 'center',
  paddingInline: 24,
  display: 'flex',
  gap: 16,
  border: '1px solid var(--ov-color-border-default)',
  borderRadius: 4,
};

const statusBoxStyle: React.CSSProperties = {
  background: 'var(--ov-color-bg-surface-raised)',
  borderRadius: 4,
  padding: 8,
  display: 'flex',
  flex: 1,
  gap: 16,
};

const flexOneStyle: React.CSSProperties = { flex: 1 };
const boldStyle: React.CSSProperties = { fontWeight: 'bold' };

type Props = {
  cluster: string;
  icon: string;
  passing: number;
  warning: number;
  failing: number;
  score: number;
};

export const ClusterOverviewCard: React.FC<Props> = ({ passing, warning, failing, score }) => {
  return (
    <div style={cardWrapperStyle}>
      <Stack direction="row" spacing={2}>
        <div style={scoreBoxStyle}>
          <Stack direction="column" spacing={0} style={flexOneStyle}>
            <Text size="xs" tone="brand" style={boldStyle}>
              Score
            </Text>
            <Heading level={4} style={boldStyle}>
              {score}
            </Heading>
          </Stack>
        </div>
        <div style={statusBoxStyle}>
          <Stack direction="column" spacing={0} style={flexOneStyle}>
            <Text size="xs" tone="success" style={boldStyle}>
              Passing
            </Text>
            <Text style={boldStyle}>{passing}</Text>
          </Stack>
          <Stack direction="column" spacing={0} style={flexOneStyle}>
            <Text size="xs" tone="warning" style={boldStyle}>
              Warning
            </Text>
            <Text style={boldStyle}>{warning}</Text>
          </Stack>
          <Stack direction="column" spacing={0} style={flexOneStyle}>
            <Text size="xs" tone="danger" style={boldStyle}>
              Failing
            </Text>
            <Text style={boldStyle}>{failing}</Text>
          </Stack>
        </div>
      </Stack>
    </div>
  );
};

export default ClusterOverviewCard;
