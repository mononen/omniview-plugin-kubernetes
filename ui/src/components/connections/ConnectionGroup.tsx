import React from 'react';

import ConnectionGroupHeader from './ConnectionGroupHeader';

type Props = {
  groupKey: string;
  label: string;
  count: number;
  provider?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  /** If true, don't render the header (used for ungrouped flat view) */
  hideHeader?: boolean;
  children: React.ReactNode;
};

const ConnectionGroup: React.FC<Props> = ({
  label,
  count,
  provider,
  isCollapsed,
  onToggleCollapse,
  hideHeader,
  children,
}) => (
  <div>
    {!hideHeader && (
      <ConnectionGroupHeader
        label={label}
        count={count}
        provider={provider}
        isCollapsed={isCollapsed}
        onToggle={onToggleCollapse}
      />
    )}
    {!isCollapsed && children}
  </div>
);

export default ConnectionGroup;
