import { Card, Chip, Stack, Text } from '@omniviewdev/base-ui';
import React from 'react';
import { LuExternalLink } from 'react-icons/lu';

import type { HelmChart } from './types';

interface Props {
  maintainers: NonNullable<HelmChart['maintainers']>;
  keywords: string[];
  dependencies: NonNullable<HelmChart['dependencies']>;
}

const sectionCardStyle: React.CSSProperties = { padding: 10, borderRadius: 4 };

const sectionHeadingStyle: React.CSSProperties = { display: 'block', marginBottom: 4 };

const maintainerLinkStyle: React.CSSProperties = {
  marginLeft: 4,
  color: 'var(--ov-color-accent-strong)',
  textDecoration: 'none',
};

const ChartOverviewTab: React.FC<Props> = ({ maintainers, keywords, dependencies }) => (
  <Stack direction="column" spacing={3}>
    {/* Maintainers */}
    {maintainers.length > 0 && (
      <Card style={sectionCardStyle} variant="outline">
        <Text weight="semibold" size="sm" style={sectionHeadingStyle}>
          Maintainers
        </Text>
        <Stack direction="column" spacing={1}>
          {maintainers.map((m) => (
            <Text key={`${m.name}-${m.email ?? ''}-${m.url ?? ''}`} size="xs" tone="muted">
              {m.name}
              {m.email ? ` <${m.email}>` : ''}
              {m.url && (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={maintainerLinkStyle}
                  aria-label={`${m.name} homepage`}
                >
                  <LuExternalLink size={10} />
                </a>
              )}
            </Text>
          ))}
        </Stack>
      </Card>
    )}

    {/* Keywords */}
    {keywords.length > 0 && (
      <Card style={sectionCardStyle} variant="outline">
        <Text weight="semibold" size="sm" style={sectionHeadingStyle}>
          Keywords
        </Text>
        <Stack direction="row" spacing={1} wrap>
          {keywords.map((kw) => (
            <Chip key={kw} size="sm" variant="soft" color="neutral">
              {kw}
            </Chip>
          ))}
        </Stack>
      </Card>
    )}

    {/* Dependencies */}
    {dependencies.length > 0 && (
      <Card style={sectionCardStyle} variant="outline">
        <Text weight="semibold" size="sm" style={sectionHeadingStyle}>
          Dependencies
        </Text>
        <Stack direction="column" spacing={1}>
          {dependencies.map((dep) => (
            <Stack key={dep.name} direction="row" spacing={2} align="center">
              <Text size="xs" weight="semibold">
                {dep.name}
              </Text>
              {dep.version && (
                <Chip size="sm" variant="soft" color="neutral">
                  {dep.version}
                </Chip>
              )}
              {dep.repository && (
                <Text size="xs" tone="subtle">
                  {dep.repository}
                </Text>
              )}
            </Stack>
          ))}
        </Stack>
      </Card>
    )}
  </Stack>
);

ChartOverviewTab.displayName = 'ChartOverviewTab';
export default ChartOverviewTab;
