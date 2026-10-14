import { IconButton } from '@omniviewdev/base-ui';
import React from 'react';
import { LuClipboardCopy, LuCheck } from 'react-icons/lu';

import CodeEditor from '../../../shared/CodeEditor';

import styles from './ChartValuesTab.module.css';

interface Props {
  valuesContent: string | undefined;
  copied: boolean;
  onCopy: () => void;
}

const VALUES_PANEL_HEIGHT = 500;

const valuesContainerStyle: React.CSSProperties = {
  position: 'relative',
  height: VALUES_PANEL_HEIGHT,
  border: '1px solid var(--ov-color-border-default)',
  borderRadius: 4,
  overflow: 'hidden',
};

const ChartValuesTab: React.FC<Props> = ({ valuesContent, copied, onCopy }) => (
  <div style={valuesContainerStyle}>
    <CodeEditor
      filename="values.yaml"
      language="yaml"
      value={valuesContent ?? '# Loading...'}
      readOnly
      height={VALUES_PANEL_HEIGHT}
    />
    {/* Copy button overlay */}
    <IconButton
      size="xs"
      variant="ghost"
      color="neutral"
      onClick={onCopy}
      title={copied ? 'Copied!' : 'Copy values'}
      aria-label={copied ? 'Copied!' : 'Copy values'}
      disabled={!valuesContent}
      className={styles.copyButton}
    >
      {copied ? <LuCheck size={12} /> : <LuClipboardCopy size={12} />}
    </IconButton>
  </div>
);

ChartValuesTab.displayName = 'ChartValuesTab';
export default ChartValuesTab;
