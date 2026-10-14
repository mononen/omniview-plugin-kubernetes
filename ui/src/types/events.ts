import type { ComponentColor } from '@omniviewdev/base-ui';
import type React from 'react';

/**
 * Kubernetes event shape used by event lists (formerly `KubeEvent` from
 * `@omniviewdev/ui/domain`).
 */
export interface KubeEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  count?: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
  involvedObject?: { kind: string; name: string; namespace?: string };
}

/**
 * A single entry for a timeline view (formerly `TimelineEvent` from
 * `@omniviewdev/ui/domain`).
 */
export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string | Date;
  icon?: React.ReactNode;
  color?: ComponentColor;
}
