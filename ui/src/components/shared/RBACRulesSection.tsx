import { Chip, Stack, Text } from '@omniviewdev/base-ui';
import type { PolicyRule } from 'kubernetes-types/rbac/v1';
import React from 'react';

import ExpandableSections, { type ExpandableSection } from './ExpandableSections';

const chipStyle: React.CSSProperties = { borderRadius: 4 };
const chipListStyle: React.CSSProperties = { paddingBlock: 2 };
const ruleBodyStyle: React.CSSProperties = { paddingInline: 8, paddingBlock: 4 };

const ChipList: React.FC<{ label: string; items?: string[] }> = ({ label, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <Stack direction="column" spacing={1} style={chipListStyle}>
      <Text size="xs" tone="muted">
        {label}
      </Text>
      <Stack direction="row" spacing={1} wrap>
        {items.map((item, idx) => (
          <Chip key={`${item}-${idx}`} size="xs" variant="soft" color="neutral" style={chipStyle}>
            {item || '*'}
          </Chip>
        ))}
      </Stack>
    </Stack>
  );
};

interface Props {
  rules?: PolicyRule[];
}

const RBACRulesSection: React.FC<Props> = ({ rules }) => {
  if (!rules || rules.length === 0) return null;

  const sections: ExpandableSection[] = rules.map((rule, i) => ({
    title: `Rule ${i + 1}`,
    defaultExpanded: i === 0,
    children: (
      <Stack direction="column" spacing={1} style={ruleBodyStyle}>
        <ChipList label="API Groups" items={rule.apiGroups} />
        <ChipList label="Resources" items={rule.resources} />
        <ChipList label="Verbs" items={rule.verbs} />
        <ChipList label="Resource Names" items={rule.resourceNames} />
        <ChipList label="Non-Resource URLs" items={rule.nonResourceURLs} />
      </Stack>
    ),
  }));

  return <ExpandableSections sections={sections} />;
};

export default RBACRulesSection;
