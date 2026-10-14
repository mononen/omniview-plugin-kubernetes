import { Stack, Text } from '@omniviewdev/base-ui';
import type React from 'react';

import { sectionWrapperStackStyle, sectionWrapperHeaderStyle, sectionWrapperBodyStyle } from './constants';

function SectionWrapper({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="column" spacing={0} style={sectionWrapperStackStyle}>
      <div style={sectionWrapperHeaderStyle}>
        <Stack direction="column" spacing={0} style={{ gap: 2 }}>
          <Text weight="semibold" size="lg">
            {title}
          </Text>
          <Text size="xs" tone="muted">
            {description}
          </Text>
        </Stack>
      </div>
      <div style={sectionWrapperBodyStyle}>{children}</div>
    </Stack>
  );
}

export default SectionWrapper;
