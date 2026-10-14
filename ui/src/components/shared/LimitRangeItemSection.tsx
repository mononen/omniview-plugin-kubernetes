import { Chip, Stack, Text } from '@omniviewdev/base-ui';
import React from 'react';

import ExpandableSections, { type ExpandableSection } from './ExpandableSections';
import LabeledEntry from './LabeledEntry';

const chipStyle: React.CSSProperties = { borderRadius: 4 };
const kvRowsStyle: React.CSSProperties = { gap: 2, paddingBlock: 2 };
const titleRowStyle: React.CSSProperties = { gap: 6 };
const bodyStyle: React.CSSProperties = { paddingInline: 8, paddingBlock: 4 };

interface LimitRangeItemLike {
  type?: string;
  default?: Record<string, string>;
  defaultRequest?: Record<string, string>;
  max?: Record<string, string>;
  min?: Record<string, string>;
  maxLimitRequestRatio?: Record<string, string>;
}

interface Props {
  limits?: LimitRangeItemLike[];
}

const KVRows: React.FC<{ title: string; kv?: Record<string, string> }> = ({ title, kv }) => {
  if (!kv || Object.keys(kv).length === 0) return null;
  return (
    <Stack direction="column" spacing={0} style={kvRowsStyle}>
      <Text size="xs" tone="muted">
        {title}
      </Text>
      {Object.entries(kv).map(([k, v]) => (
        <LabeledEntry key={k} label={k} value={v} />
      ))}
    </Stack>
  );
};

const LimitRangeItemSection: React.FC<Props> = ({ limits }) => {
  if (!limits || limits.length === 0) return null;

  const sections: ExpandableSection[] = limits.map((limit, i) => ({
    title: (
      <Stack direction="row" spacing={0} align="center" style={titleRowStyle}>
        <Text weight="semibold" size="xs">
          {`Limit ${i + 1}`}
        </Text>
        {limit.type && (
          <Chip size="xs" variant="soft" color="brand" style={chipStyle}>
            {limit.type}
          </Chip>
        )}
      </Stack>
    ),
    defaultExpanded: i === 0,
    children: (
      <Stack direction="column" spacing={1} style={bodyStyle}>
        <KVRows title="Default" kv={limit.default} />
        <KVRows title="Default Request" kv={limit.defaultRequest} />
        <KVRows title="Max" kv={limit.max} />
        <KVRows title="Min" kv={limit.min} />
        <KVRows title="Max Limit/Request Ratio" kv={limit.maxLimitRequestRatio} />
      </Stack>
    ),
  }));

  return <ExpandableSections sections={sections} />;
};

export default LimitRangeItemSection;
