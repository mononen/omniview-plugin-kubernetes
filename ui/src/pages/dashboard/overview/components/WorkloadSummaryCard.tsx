import { Skeleton, Text } from '@omniviewdev/base-ui';
import React from 'react';

import styles from './WorkloadSummaryCard.module.css';

const skeletonStyle: React.CSSProperties = { borderRadius: 4, height: '100%', minHeight: 88 };

type StatusEntry = {
  label: string;
  count: number;
  color: 'success' | 'warning' | 'danger' | 'neutral';
};

type Props = {
  title: string;
  icon: React.ReactNode;
  total: number;
  statuses: StatusEntry[];
  loading?: boolean;
  onClick?: () => void;
};

/** Map status breakdown to a single accent colour token for the card value. */
function deriveColor(statuses: StatusEntry[]): string {
  const hasDanger = statuses.some((s) => s.color === 'danger' && s.count > 0);
  const hasWarning = statuses.some((s) => s.color === 'warning' && s.count > 0);
  if (hasDanger) return 'var(--ov-color-danger)';
  if (hasWarning) return 'var(--ov-color-warning)';
  return 'var(--ov-color-brand-500)';
}

/** Build a compact description from the visible statuses. */
function deriveDescription(statuses: StatusEntry[]): string {
  const visible = statuses.filter((s) => s.count > 0);
  if (visible.length === 0) return 'No active workloads';
  return visible.map((s) => `${s.count} ${s.label}`).join(', ');
}

const WorkloadSummaryCard: React.FC<Props> = ({
  title,
  icon,
  total,
  statuses,
  loading,
  onClick,
}) => {
  if (loading) {
    return <Skeleton variant="rounded" style={skeletonStyle} />;
  }

  const content = (
    <>
      <div className={styles.header}>
        <div>
          <div className={styles.value} style={{ color: deriveColor(statuses) }}>
            {total}
          </div>
          <Text as="div" size="sm" tone="muted" className={styles.label}>
            {title}
          </Text>
        </div>
        {icon && <div className={styles.icon}>{icon}</div>}
      </div>
      <Text as="div" size="xs" tone="subtle" className={styles.description}>
        {deriveDescription(statuses)}
      </Text>
    </>
  );

  if (!onClick) return <div className={styles.card}>{content}</div>;

  return (
    <button type="button" onClick={onClick} className={`${styles.card} ${styles.clickable}`}>
      {content}
    </button>
  );
};

export default WorkloadSummaryCard;
