import { Stack, Text } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { ValidatingAdmissionPolicy } from 'kubernetes-types/admissionregistration/v1';
import React from 'react';

import ConditionChip from '../../../../../shared/ConditionChip';
import ExpandableSections, { type ExpandableSection } from '../../../../../shared/ExpandableSections';
import LabeledEntry from '../../../../../shared/LabeledEntry';
import MatchResourcesSection from '../../../../../shared/MatchResourcesSection';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';
import SidebarSection from '../../../../../shared/SidebarSection';
const codeTextStyle: React.CSSProperties = { fontFamily: 'var(--ov-font-mono)', whiteSpace: 'pre-wrap' };

const cardContentStyle = { paddingInline: 8, paddingBlock: 4 } as const;

const fullWidthStyle = { width: '100%' } as const;

interface Props {
  ctx: DrawerContext<ValidatingAdmissionPolicy>;
}

export const ValidatingAdmissionPolicySidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) return null;

  const vap = ctx.data;
  const spec = vap.spec;
  const status = vap.status;
  const conditions = status?.conditions || [];
  const validations = spec?.validations;
  const auditAnnotations = spec?.auditAnnotations;
  const matchConditions = spec?.matchConditions;
  const variables = spec?.variables;

  // Build expandable sections for validations
  const validationSections: ExpandableSection[] = (validations || []).map((v, i) => ({
    title: `Validation ${i + 1}`,
    defaultExpanded: i === 0,
    children: (
      <Stack direction="column" spacing={1} style={cardContentStyle}>
        <Text size="xs" style={codeTextStyle}>
          {v.expression}
        </Text>
        {v.message && <LabeledEntry label="Message" value={v.message} />}
        {v.reason && <LabeledEntry label="Reason" value={v.reason} />}
        {v.messageExpression && (
          <LabeledEntry label="Message Expression" value={v.messageExpression} />
        )}
      </Stack>
    ),
  }));

  const auditSections: ExpandableSection[] = (auditAnnotations || []).map((a, i) => ({
    title: a.key || `Annotation ${i + 1}`,
    children: (
      <Stack direction="column" spacing={1} style={cardContentStyle}>
        <Text size="xs" style={codeTextStyle}>
          {a.valueExpression}
        </Text>
      </Stack>
    ),
  }));

  const matchConditionSections: ExpandableSection[] = (matchConditions || []).map((mc, i) => ({
    title: mc.name || `Condition ${i + 1}`,
    children: (
      <Stack direction="column" spacing={1} style={cardContentStyle}>
        <Text size="xs" style={codeTextStyle}>
          {mc.expression}
        </Text>
      </Stack>
    ),
  }));

  const variableSections: ExpandableSection[] = (variables || []).map((v, i) => ({
    title: v.name || `Variable ${i + 1}`,
    children: (
      <Stack direction="column" spacing={1} style={cardContentStyle}>
        <Text size="xs" style={codeTextStyle}>
          {v.expression}
        </Text>
      </Stack>
    ),
  }));

  return (
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={vap.metadata} connectionID={ctx.resource?.connectionID} />

        <SidebarSection
          title="Configuration"
          headerRight={conditions.length > 0 ? (
            <Stack direction="row" spacing={1} wrap justify="end">
              {conditions.map((c) => (
                <ConditionChip key={c.type} condition={c} />
              ))}
            </Stack>
          ) : undefined}
        >
            <LabeledEntry label="Failure Policy" value={spec?.failurePolicy} />
            {spec?.paramKind && (
              <LabeledEntry
                label="Param Kind"
                value={`${spec.paramKind.apiVersion}/${spec.paramKind.kind}`}
              />
            )}
        </SidebarSection>
      </Stack>

      <MatchResourcesSection matchResources={spec?.matchConstraints} />

      {validationSections.length > 0 && <ExpandableSections sections={validationSections} />}
      {auditSections.length > 0 && <ExpandableSections sections={auditSections} />}
      {matchConditionSections.length > 0 && (
        <ExpandableSections sections={matchConditionSections} />
      )}
      {variableSections.length > 0 && <ExpandableSections sections={variableSections} />}
    </Stack>
  );
};

ValidatingAdmissionPolicySidebar.displayName = 'ValidatingAdmissionPolicySidebar';
export default ValidatingAdmissionPolicySidebar;
