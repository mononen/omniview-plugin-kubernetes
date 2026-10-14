import { Separator, Stack, Text } from '@omniviewdev/base-ui';
import React from 'react';

const sectionBorderStyle: React.CSSProperties = {
  borderRadius: 4,
  border: '1px solid var(--ov-color-border-default)',
};

const simpleHeaderStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8 };

const flexHeaderStyle: React.CSSProperties = {
  paddingBlock: 4,
  paddingInline: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const defaultBodyStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8 };

const headerLeftStyle: React.CSSProperties = { gap: 6 };

interface SidebarSectionProps {
  title: string;
  headerRight?: React.ReactNode;
  headerLeft?: React.ReactNode;
  /** Extra inline styles merged onto the body container. */
  bodyStyle?: React.CSSProperties;
  children: React.ReactNode;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  headerRight,
  headerLeft,
  bodyStyle,
  children,
}) => {
  const useFlexHeader = !!headerRight;

  return (
    <div style={sectionBorderStyle}>
      <div style={useFlexHeader ? flexHeaderStyle : simpleHeaderStyle}>
        {headerLeft ? (
          <Stack direction="row" spacing={0} align="center" style={headerLeftStyle}>
            <Text weight="semibold" size="sm">
              {title}
            </Text>
            {headerLeft}
          </Stack>
        ) : (
          <Text weight="semibold" size="sm">
            {title}
          </Text>
        )}
        {headerRight}
      </div>
      <Separator />
      <div style={bodyStyle ? { ...defaultBodyStyle, ...bodyStyle } : defaultBodyStyle}>
        {children}
      </div>
    </div>
  );
};

export default SidebarSection;
