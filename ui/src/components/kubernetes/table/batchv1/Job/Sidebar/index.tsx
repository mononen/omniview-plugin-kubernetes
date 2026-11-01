import { Chip, Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { Job } from 'kubernetes-types/batch/v1';
import type { Condition } from 'kubernetes-types/meta/v1';
import React from 'react';

import JobStatusSection from '../../../../../shared/JobStatusSection';
import LabeledEntry from '../../../../../shared/LabeledEntry';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import SidebarSection from '../../../../../shared/SidebarSection';
import WorkloadPortsCard from '../../../../../shared/WorkloadPortsCard';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<Job>;
}

export const JobSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const job = ctx.data;
  const spec = job.spec;
  const status = job.status;
  const conditions = (status?.conditions || []) as Condition[];

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={job.metadata} connectionID={ctx.resource?.route.connection} />

        <JobStatusSection status={status} conditions={conditions} />

        <SidebarSection
          title="Configuration"
          headerLeft={spec?.suspend && <Chip size="xs" color="warning">Suspended</Chip>}
        >
          <LabeledEntry label="Completions" value={spec?.completions !== undefined ? String(spec.completions) : undefined} />
          <LabeledEntry label="Parallelism" value={spec?.parallelism !== undefined ? String(spec.parallelism) : undefined} />
          <LabeledEntry label="Backoff Limit" value={spec?.backoffLimit !== undefined ? String(spec.backoffLimit) : undefined} />
          <LabeledEntry label="Active Deadline" value={spec?.activeDeadlineSeconds !== undefined ? `${spec.activeDeadlineSeconds}s` : undefined} />
          <LabeledEntry label="Completion Mode" value={spec?.completionMode} />
          <LabeledEntry label="TTL After Finished" value={spec?.ttlSecondsAfterFinished !== undefined ? `${spec.ttlSecondsAfterFinished}s` : undefined} />
        </SidebarSection>
      </Stack>

      {job.spec?.template?.spec && (
        <WorkloadPortsCard
          podSpec={job.spec.template.spec}
          resourceKey="k8s:batch/jobs"
          resource={ctx.resource}
          resourceID={ctx.resource?.reference.address.id || ''}
          connectionID={ctx.resource?.route.connection || ''}
        />
      )}
    </Stack>
  );
};

JobSidebar.displayName = 'JobSidebar';
export default JobSidebar;
