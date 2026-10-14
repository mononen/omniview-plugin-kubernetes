import { Stack, Text } from '@omniviewdev/base-ui';
import type { Node as K8sNode, Event as K8sEvent, Pod, NodeCondition  } from 'kubernetes-types/core/v1';
import React from 'react';
import { LuCircleCheck, LuTriangleAlert, LuCircleX } from 'react-icons/lu';

const bannerBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  paddingBlock: 4,
  paddingInline: 12,
  borderRadius: 4,
};

const BANNER_COLORS = {
  success: { background: 'var(--ov-color-success-soft)', border: '1px solid var(--ov-color-success)' },
  warning: { background: 'var(--ov-color-warning-soft)', border: '1px solid var(--ov-color-warning)' },
  danger: { background: 'var(--ov-color-danger-soft)', border: '1px solid var(--ov-color-danger)' },
} as const;

function bannerStyle(color: keyof typeof BANNER_COLORS): React.CSSProperties {
  return { ...bannerBaseStyle, ...BANNER_COLORS[color] };
}

type Props = {
  nodes: K8sNode[];
  pods: Pod[];
  events: K8sEvent[];
};

const ClusterHealthBanner: React.FC<Props> = ({ nodes, pods, events }) => {
  const health = React.useMemo(() => {
    const unhealthyNodes = nodes.filter((n) => {
      const conditions: NodeCondition[] = n.status?.conditions ?? [];
      const ready = conditions.find((c) => c.type === 'Ready');
      return !ready || ready.status !== 'True';
    });

    const failedPods = pods.filter((p) => p.status?.phase === 'Failed');
    const pendingPods = pods.filter((p) => p.status?.phase === 'Pending');
    const warningEvents = events.filter((e) => e.type === 'Warning');

    const issues: string[] = [];
    if (unhealthyNodes.length > 0)
      issues.push(`${unhealthyNodes.length} node${unhealthyNodes.length > 1 ? 's' : ''} not ready`);
    if (failedPods.length > 0)
      issues.push(`${failedPods.length} failed pod${failedPods.length > 1 ? 's' : ''}`);
    if (pendingPods.length > 0)
      issues.push(`${pendingPods.length} pending pod${pendingPods.length > 1 ? 's' : ''}`);
    if (warningEvents.length > 0)
      issues.push(`${warningEvents.length} warning event${warningEvents.length > 1 ? 's' : ''}`);

    const hasErrors = unhealthyNodes.length > 0 || failedPods.length > 0;

    return { issues, hasErrors };
  }, [nodes, pods, events]);

  const color: 'success' | 'warning' | 'danger' = health.issues.length === 0 ? 'success' : health.hasErrors ? 'danger' : 'warning';
  const Icon =
    health.issues.length === 0 ? LuCircleCheck : health.hasErrors ? LuCircleX : LuTriangleAlert;

  if (health.issues.length === 0) {
    return (
      <div style={bannerStyle(color)}>
        <Icon size={14} />
        <Text size="xs">All systems operational</Text>
      </div>
    );
  }

  return (
    <div style={bannerStyle(color)}>
      <Icon size={14} />
      <Stack direction="row" spacing={4} wrap>
        {health.issues.map((issue) => (
          <Text key={issue} size="xs">
            {issue}
          </Text>
        ))}
      </Stack>
    </div>
  );
};

export default ClusterHealthBanner;
