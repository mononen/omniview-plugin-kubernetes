import { Chip, Stack, Text } from '@omniviewdev/base-ui';
import React from 'react';

import styles from './ChartVersionsTab.module.css';
import type { ChartVersion } from './types';
import { formatDate, relativeTime } from './utils';

interface Props {
  versions: ChartVersion[];
  selectedVersion: string;
  onVersionChange: (version: string) => void;
  loading?: boolean;
}

const appVersionStyle: React.CSSProperties = { minWidth: 80, flexShrink: 0 };

const badgesStackStyle: React.CSSProperties = { flex: 1, minWidth: 0 };

const dateTextStyle: React.CSSProperties = { flexShrink: 0 };

const ChartVersionsTab: React.FC<Props> = ({
  versions,
  selectedVersion,
  onVersionChange,
  loading = false,
}) => (
  <>
    {versions.length > 0 ? (
      <div className={styles.list}>
        {versions.map((v) => {
          const isSelected = v.version === selectedVersion;
          return (
            <div
              key={v.version}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              className={isSelected ? `${styles.row} ${styles.rowSelected}` : styles.row}
              onClick={() => onVersionChange(v.version)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onVersionChange(v.version);
                }
              }}
            >
              {/* Version */}
              <Text
                size="xs"
                weight={isSelected ? 'semibold' : undefined}
                tone={isSelected ? 'brand' : 'default'}
                style={{ minWidth: 100 }}
              >
                {v.version}
              </Text>

              {/* App version */}
              <Text size="xs" tone="subtle" style={appVersionStyle}>
                {v.appVersion || '—'}
              </Text>

              {/* Badges */}
              <Stack direction="row" spacing={1} style={badgesStackStyle}>
                {isSelected && (
                  <Chip size="sm" variant="soft" color="brand">
                    Selected
                  </Chip>
                )}
                {v.deprecated && (
                  <Chip size="sm" variant="soft" color="warning">
                    Deprecated
                  </Chip>
                )}
              </Stack>

              {/* Date */}
              {v.created && (
                <span title={formatDate(v.created)}>
                  <Text size="xs" tone="subtle" style={dateTextStyle}>
                    {relativeTime(v.created)}
                  </Text>
                </span>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <Text size="sm" tone="muted">
        {loading ? 'Loading versions...' : 'No versions available'}
      </Text>
    )}
  </>
);

ChartVersionsTab.displayName = 'ChartVersionsTab';
export default ChartVersionsTab;
