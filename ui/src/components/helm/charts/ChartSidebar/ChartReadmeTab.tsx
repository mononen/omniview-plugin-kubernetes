import { Text } from '@omniviewdev/base-ui';
import { MarkdownPreview } from '@omniviewdev/editors';
import React from 'react';

import styles from './ChartReadmeTab.module.css';

interface Props {
  readmeContent: string | undefined;
}

const ChartReadmeTab: React.FC<Props> = ({ readmeContent }) => (
  <>
    {readmeContent ? (
      <MarkdownPreview className={styles.readme} content={readmeContent} />
    ) : readmeContent === '' ? (
      <Text size="sm" tone="muted">
        No README available for this chart.
      </Text>
    ) : (
      <Text size="sm" tone="muted">
        Loading README...
      </Text>
    )}
  </>
);

ChartReadmeTab.displayName = 'ChartReadmeTab';
export default ChartReadmeTab;
