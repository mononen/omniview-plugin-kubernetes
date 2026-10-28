import { Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { RoleBinding } from 'kubernetes-types/rbac/v1';
import React from 'react';

import LabeledEntry from '../../../../../shared/LabeledEntry';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import ResourceLinkChip from '../../../../../shared/ResourceLinkChip';
import SidebarSection from '../../../../../shared/SidebarSection';

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<RoleBinding>;
}

export const RoleBindingSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const rb = ctx.data;
  const connectionID = ctx.resource?.route.connection || '';
  const namespace = rb.metadata?.namespace;
  const roleRef = rb.roleRef;
  const subjects = rb.subjects;

  const roleKey = roleRef?.kind === 'ClusterRole'
    ? 'k8s:rbac.authorization.k8s.io/clusterroles'
    : 'k8s:rbac.authorization.k8s.io/roles';

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={rb.metadata} connectionID={ctx.resource?.route.connection} />

        {roleRef && (
          <SidebarSection title="Role Reference">
              <LabeledEntry
                label={roleRef.kind || 'Role'}
                value={
                  <ResourceLinkChip
                    connectionID={connectionID}
                    namespace={roleRef.kind === 'Role' ? namespace : undefined}
                    resourceID={roleRef.name || ''}
                    resourceKey={roleKey}
                    resourceName={roleRef.name}
                  />
                }
              />
          </SidebarSection>
        )}

        {subjects && subjects.length > 0 && (
          <SidebarSection title="Subjects">
              {subjects.map((subj, i) => (
                <LabeledEntry
                  key={`${subj.kind}-${subj.name}-${i}`}
                  label={subj.kind || 'Subject'}
                  value={
                    subj.kind === 'ServiceAccount' ? (
                      <ResourceLinkChip
                        connectionID={connectionID}
                        namespace={subj.namespace}
                        resourceID={subj.name || ''}
                        resourceKey="k8s:/serviceaccounts"
                        resourceName={subj.name}
                      />
                    ) : (
                      `${subj.name}${subj.namespace ? ` (${subj.namespace})` : ''}`
                    )
                  }
                />
              ))}
          </SidebarSection>
        )}
      </Stack>
    </Stack>
  );
};

RoleBindingSidebar.displayName = 'RoleBindingSidebar';
export default RoleBindingSidebar;
