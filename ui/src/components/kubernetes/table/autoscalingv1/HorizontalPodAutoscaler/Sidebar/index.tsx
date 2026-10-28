import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import { formatRelative } from 'date-fns';
import type { HorizontalPodAutoscaler } from 'kubernetes-types/autoscaling/v2';
import React from 'react';

import LabeledEntry from '../../../../../shared/LabeledEntry';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import ResourceLinkChip from '../../../../../shared/ResourceLinkChip';
import SidebarSection from '../../../../../shared/SidebarSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<HorizontalPodAutoscaler>;
}

function resolveResourceKey(kind?: string): string {
  switch (kind) {
    case 'Deployment':
      return 'k8s:apps/deployments';
    case 'StatefulSet':
      return 'k8s:apps/statefulsets';
    case 'ReplicaSet':
      return 'k8s:apps/replicasets';
    case 'ReplicationController':
      return 'k8s:/replicationcontrollers';
    default:
      return `apps::v1::${kind || 'Deployment'}`;
  }
}

export const HorizontalPodAutoscalerSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const hpa = ctx.data;
  const connectionID = ctx.resource?.route.connection || '';
  const namespace = hpa.metadata?.namespace;
  const spec = hpa.spec;
  const status = hpa.status;
  const targetRef = spec?.scaleTargetRef;

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={hpa.metadata} connectionID={ctx.resource?.route.connection} />

        {targetRef && (
          <SidebarSection title="Scale Target">
            <LabeledEntry
              label={targetRef.kind || 'Target'}
              value={
                <ResourceLinkChip
                  connectionID={connectionID}
                  namespace={namespace}
                  resourceID={targetRef.name || ''}
                  resourceKey={resolveResourceKey(targetRef.kind)}
                  resourceName={targetRef.name}
                />
              }
            />
          </SidebarSection>
        )}

        <SidebarSection title="Configuration">
          <LabeledEntry
            label="Min Replicas"
            value={spec?.minReplicas !== undefined ? String(spec.minReplicas) : undefined}
          />
          <LabeledEntry
            label="Max Replicas"
            value={spec?.maxReplicas !== undefined ? String(spec.maxReplicas) : undefined}
          />
        </SidebarSection>

        {status && (
          <SidebarSection title="Status">
            <LabeledEntry
              label="Current Replicas"
              value={
                status.currentReplicas !== undefined
                  ? String(status.currentReplicas)
                  : undefined
              }
            />
            <LabeledEntry
              label="Desired Replicas"
              value={
                status.desiredReplicas !== undefined
                  ? String(status.desiredReplicas)
                  : undefined
              }
            />
            {status.lastScaleTime && (
              <LabeledEntry
                label="Last Scale Time"
                value={formatRelative(new Date(status.lastScaleTime), new Date())}
              />
            )}
          </SidebarSection>
        )}
      </Stack>
    </Stack>
  );
};

HorizontalPodAutoscalerSidebar.displayName = 'HorizontalPodAutoscalerSidebar';
export default HorizontalPodAutoscalerSidebar;
