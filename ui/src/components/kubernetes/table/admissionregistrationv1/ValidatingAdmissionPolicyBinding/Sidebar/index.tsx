import { Chip, Stack } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { ValidatingAdmissionPolicyBinding } from 'kubernetes-types/admissionregistration/v1';
import React from 'react';

import LabeledEntry from '../../../../../shared/LabeledEntry';
import MatchResourcesSection from '../../../../../shared/MatchResourcesSection';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import ResourceLinkChip from '../../../../../shared/ResourceLinkChip';
import SidebarSection from '../../../../../shared/SidebarSection';

const fullWidthStyle = { width: '100%' } as const;

const chipStyle = { borderRadius: 4 } as const;

interface Props {
  ctx: DrawerContext<ValidatingAdmissionPolicyBinding>;
}

export const ValidatingAdmissionPolicyBindingSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const vapb = ctx.data;
  const connectionID = ctx.resource?.route.connection || '';
  const spec = vapb.spec;
  const validationActions = spec?.validationActions;

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={vapb.metadata} connectionID={ctx.resource?.route.connection} />

        <SidebarSection title="Binding">
            {spec?.policyName && (
              <LabeledEntry
                label="Policy"
                value={
                  <ResourceLinkChip
                    connectionID={connectionID}
                    resourceID={spec.policyName}
                    resourceKey="k8s:admissionregistration.k8s.io/validatingadmissionpolicies"
                    resourceName={spec.policyName}
                  />
                }
              />
            )}
            {spec?.paramRef && (
              <>
                <LabeledEntry label="Param Name" value={spec.paramRef.name} />
                <LabeledEntry label="Param Namespace" value={spec.paramRef.namespace} />
                <LabeledEntry
                  label="Param Selector"
                  value={spec.paramRef.selector?.matchLabels
                    ? Object.entries(spec.paramRef.selector.matchLabels)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(', ')
                    : undefined}
                />
              </>
            )}
            {validationActions && validationActions.length > 0 && (
              <LabeledEntry
                label="Actions"
                value={
                  <Stack direction="row" spacing={1} wrap>
                    {validationActions.map((action) => (
                      <Chip key={action} size="xs" color="brand" style={chipStyle}>{action}</Chip>
                    ))}
                  </Stack>
                }
              />
            )}
        </SidebarSection>
      </Stack>

      <MatchResourcesSection matchResources={spec?.matchResources} />
    </Stack>
  );
};

ValidatingAdmissionPolicyBindingSidebar.displayName = 'ValidatingAdmissionPolicyBindingSidebar';
export default ValidatingAdmissionPolicyBindingSidebar;
