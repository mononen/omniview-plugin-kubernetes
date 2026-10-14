import { Text } from '@omniviewdev/base-ui';
import React from 'react';

import SidebarSection from './SidebarSection';

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 2,
  alignItems: 'center',
};

interface Props {
  hard?: Record<string, string>;
  used?: Record<string, string>;
}

const QuotaUsageTable: React.FC<Props> = ({ hard, used }) => {
  if (!hard || Object.keys(hard).length === 0) return null;

  const resources = Object.keys(hard);

  return (
    <SidebarSection title="Resource Quota">
      <div style={gridStyle}>
        <Text size="xs" weight="semibold" tone="muted">
          Resource
        </Text>
        <Text size="xs" weight="semibold" tone="muted">
          Used
        </Text>
        <Text size="xs" weight="semibold" tone="muted">
          Hard
        </Text>
        {resources.map((resource) => (
          <React.Fragment key={resource}>
            <Text size="xs" weight="semibold">
              {resource}
            </Text>
            <Text size="xs">{used?.[resource] ?? '-'}</Text>
            <Text size="xs">{hard[resource]}</Text>
          </React.Fragment>
        ))}
      </div>
    </SidebarSection>
  );
};

export default QuotaUsageTable;
