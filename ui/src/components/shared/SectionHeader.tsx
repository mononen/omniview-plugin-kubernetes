import { Text } from '@omniviewdev/base-ui';
import React from 'react';

// ── Styles ──────────────────────────────────────────────────────────────────

const simpleStyle: React.CSSProperties = { paddingInline: 4, paddingTop: 10, paddingBottom: 4 };

const simpleTitleStyle: React.CSSProperties = {
  color: 'var(--ov-color-fg-subtle)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  fontWeight: 600,
};

const richWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  paddingInline: 12,
  paddingBlock: 6,
  backgroundColor: 'var(--ov-color-bg-surface)',
  borderBottom: '1px solid var(--ov-color-border-muted)',
};

const iconStyle: React.CSSProperties = { display: 'flex', color: 'var(--ov-color-fg-subtle)', fontSize: 12 };
const richTitleStyle: React.CSSProperties = { flex: 1 };

// ── Component ───────────────────────────────────────────────────────────────

type Props = {
  title: string;
  icon?: React.ReactNode;
  count?: number;
};

const SectionHeader: React.FC<Props> = ({ title, icon, count }) => {
  if (!icon) {
    return (
      <div style={simpleStyle}>
        <Text size="xs" style={simpleTitleStyle}>
          {title}
        </Text>
      </div>
    );
  }

  return (
    <div style={richWrapperStyle}>
      <div style={iconStyle}>{icon}</div>
      <Text weight="semibold" size="xs" tone="muted" style={richTitleStyle}>
        {title}
      </Text>
      {count !== undefined && count > 0 && (
        <Text size="xs" tone="subtle">
          {count}
        </Text>
      )}
    </div>
  );
};

SectionHeader.displayName = 'SectionHeader';
export default SectionHeader;
