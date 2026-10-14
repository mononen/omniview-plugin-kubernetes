import { Button, EmptyState as BaseEmptyState } from '@omniviewdev/base-ui';
import React from 'react';
import { LuSearch, LuServerOff } from 'react-icons/lu';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 48,
  borderRadius: 'var(--ov-radius-md, 6px)',
  gap: 16,
  minHeight: 200,
  border: '1px solid var(--ov-color-border-default)',
  backgroundColor: 'var(--ov-color-bg-surface)',
};

type Props = {
  variant: 'no-connections' | 'no-results';
  onClearFilters?: () => void;
};

const EmptyState: React.FC<Props> = ({ variant, onClearFilters }) => (
  <div style={containerStyle}>
    {variant === 'no-connections' ? (
      <BaseEmptyState
        icon={<LuServerOff size={40} opacity={0.4} />}
        title="No Clusters Found"
        description="No kubeconfig contexts were detected. Add kubeconfig file paths in plugin settings to get started."
      />
    ) : (
      <BaseEmptyState
        icon={<LuSearch size={40} opacity={0.4} />}
        title="No Results"
        description="No clusters match your current search or filters."
        action={
          onClearFilters ? (
            <Button variant="soft" color="neutral" size="sm" onClick={onClearFilters}>
              Clear Filters
            </Button>
          ) : undefined
        }
      />
    )}
  </div>
);

export default EmptyState;
