import { Chip, Stack, Text, Separator } from '@omniviewdev/base-ui';
import type { RuntimeClass } from 'kubernetes-types/node/v1';
import React from 'react';

const span4Style: React.CSSProperties = { gridColumn: 'span 4', minWidth: 0 };
const span8Style: React.CSSProperties = { gridColumn: 'span 8', minWidth: 0 };

const stackStyle1 = { gap: 6 } as const;

const infoEntryGridStyle: React.CSSProperties = { minHeight: 22, alignItems: 'center', display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' };

const infoEntryLabelStyle: React.CSSProperties = { color: 'var(--ov-color-fg-muted)' };

const infoEntryValueStyle: React.CSSProperties = { fontWeight: 600, fontSize: 12 };

const sectionBorderStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid', borderColor: 'var(--ov-color-border-default)' };

const sectionHeaderStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8 };

const overheadBodyStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, background: 'var(--ov-color-bg-surface-raised)' };

interface Props {
  data: RuntimeClass;
}

const InfoEntry: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div style={infoEntryGridStyle}>
      <div style={span4Style}>
        <Text style={infoEntryLabelStyle} size="xs">
          {label}
        </Text>
      </div>
      <div style={span8Style}>
        <Text style={infoEntryValueStyle} size="xs" truncate>
          {value}
        </Text>
      </div>
    </div>
  );
};

const RuntimeClassHandlerSection: React.FC<Props> = ({ data }) => {
  const overhead = data.overhead?.podFixed;

  return (
    <div style={sectionBorderStyle}>
      <div style={sectionHeaderStyle}>
        <Stack direction="row" spacing={0} align="center" style={stackStyle1}>
          <Text weight="semibold" size="sm">
            Runtime
          </Text>
          <Chip size="sm" variant="outline">
            {data.handler ?? '—'}
          </Chip>
        </Stack>
      </div>
      {overhead && Object.keys(overhead).length > 0 && (
        <>
          <Separator />
          <div style={overheadBodyStyle}>
            <InfoEntry label="CPU Overhead" value={overhead.cpu} />
            <InfoEntry label="Memory Overhead" value={overhead.memory} />
          </div>
        </>
      )}
    </div>
  );
};

export default RuntimeClassHandlerSection;
