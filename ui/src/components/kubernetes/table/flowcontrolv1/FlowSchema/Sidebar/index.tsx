import { Chip, Stack, Text } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { FlowSchema } from 'kubernetes-types/flowcontrol/v1';
import type { Condition } from 'kubernetes-types/meta/v1';
import React from 'react';

import ConditionChip from '../../../../../shared/ConditionChip';
import ExpandableSections, { type ExpandableSection } from '../../../../../shared/ExpandableSections';
import LabeledEntry from '../../../../../shared/LabeledEntry';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import ResourceLinkChip from '../../../../../shared/ResourceLinkChip';
import SidebarSection from '../../../../../shared/SidebarSection';

const cardContentStyle = { paddingInline: 8, paddingBlock: 4 } as const;

const stackStyle1 = { gap: 2 } as const;
const fullWidthStyle = { width: '100%' } as const;

const chipStyle = { borderRadius: 4 } as const;

interface Props {
  ctx: DrawerContext<FlowSchema>;
}

export const FlowSchemaSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const fs = ctx.data;
  const connectionID = ctx.resource?.connectionID || '';
  const spec = fs.spec;
  const conditions = (fs.status?.conditions || []) as Condition[];
  const plcRef = spec?.priorityLevelConfiguration;
  const rules = spec?.rules;

  const ruleSections: ExpandableSection[] = (rules || []).map((rule, i) => ({
    title: `Rule ${i + 1}`,
    defaultExpanded: i === 0,
    children: (
      <Stack direction="column" spacing={1} style={cardContentStyle}>
        {rule.subjects && rule.subjects.length > 0 && (
          <Stack direction="column" spacing={0} style={stackStyle1}>
            <Text size="xs" tone="muted">Subjects</Text>
            <Stack direction="row" spacing={1} wrap>
              {rule.subjects.map((subj, si) => (
                <Chip key={si} size="xs" color="neutral" style={chipStyle}>{subj.kind === 'User' ? `User: ${subj.user?.name}` :
                         subj.kind === 'Group' ? `Group: ${subj.group?.name}` :
                         subj.kind === 'ServiceAccount' ? `SA: ${subj.serviceAccount?.namespace}/${subj.serviceAccount?.name}` :
                         subj.kind}</Chip>
              ))}
            </Stack>
          </Stack>
        )}
        {rule.resourceRules && rule.resourceRules.length > 0 && (
          <Stack direction="column" spacing={0} style={stackStyle1}>
            <Text size="xs" tone="muted">Resource Rules</Text>
            {rule.resourceRules.map((rr, ri) => (
              <Stack key={ri} direction="row" spacing={1} wrap>
                {rr.verbs?.map((v) => <Chip key={v} size="xs" color="neutral" style={chipStyle}>{v}</Chip>)}
                {rr.apiGroups?.map((g, gi) => <Chip key={`g-${gi}`} size="xs" color="brand" variant="outline" style={chipStyle}>{g || '*'}</Chip>)}
                {rr.resources?.map((r) => <Chip key={r} size="xs" color="info" variant="outline" style={chipStyle}>{r}</Chip>)}
              </Stack>
            ))}
          </Stack>
        )}
        {rule.nonResourceRules && rule.nonResourceRules.length > 0 && (
          <Stack direction="column" spacing={0} style={stackStyle1}>
            <Text size="xs" tone="muted">Non-Resource Rules</Text>
            {rule.nonResourceRules.map((nr, ni) => (
              <Stack key={ni} direction="row" spacing={1} wrap>
                {nr.verbs?.map((v) => <Chip key={v} size="xs" color="neutral" style={chipStyle}>{v}</Chip>)}
                {nr.nonResourceURLs?.map((u) => <Chip key={u} size="xs" color="brand" variant="outline" style={chipStyle}>{u}</Chip>)}
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    ),
  }));

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={fs.metadata} />

        <SidebarSection
          title="Configuration"
          headerRight={conditions.length > 0 ? (
            <Stack direction="row" spacing={1} wrap justify="end">
              {conditions.map((c) => <ConditionChip key={c.type} condition={c} />)}
            </Stack>
          ) : undefined}
        >
            {plcRef?.name && (
              <LabeledEntry
                label="Priority Level"
                value={
                  <ResourceLinkChip
                    connectionID={connectionID}
                    resourceID={plcRef.name}
                    resourceKey="flowcontrol::v1::PriorityLevelConfiguration"
                    resourceName={plcRef.name}
                  />
                }
              />
            )}
            <LabeledEntry label="Matching Precedence" value={spec?.matchingPrecedence !== undefined ? String(spec.matchingPrecedence) : undefined} />
            <LabeledEntry label="Distinguisher Method" value={spec?.distinguisherMethod?.type} />
        </SidebarSection>
      </Stack>

      {ruleSections.length > 0 && <ExpandableSections sections={ruleSections} />}
    </Stack>
  );
};

FlowSchemaSidebar.displayName = 'FlowSchemaSidebar';
export default FlowSchemaSidebar;
