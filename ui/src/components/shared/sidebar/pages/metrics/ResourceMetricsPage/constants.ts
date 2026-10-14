import type React from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CHART_COLORS = [
  'var(--ov-color-brand-500)',
  'var(--ov-color-secondary)',
  'var(--ov-color-success)',
  'var(--ov-color-warning)',
  'var(--ov-color-secondary)',
  'var(--ov-color-info)',
];

// ---------------------------------------------------------------------------
// Unit labels
// ---------------------------------------------------------------------------

export const UNIT_LABELS: Record<number, string> = {
  0: '', // NONE
  1: 'B', // BYTES
  2: 'KB',
  3: 'MB',
  4: 'GB',
  5: '%', // PERCENTAGE
  6: 'ms', // MILLISECONDS
  7: 's', // SECONDS
  8: '', // COUNT
  9: 'ops/s', // OPS_PER_SEC
  10: 'B/s', // BYTES_PER_SEC
  11: 'm', // MILLICORES
  12: 'cores', // CORES
};

// ---------------------------------------------------------------------------
// Icon -> category mapping for tile grouping
// ---------------------------------------------------------------------------

export const ICON_CATEGORIES: Record<string, string> = {
  LuCpu: 'CPU',
  LuMemoryStick: 'Memory',
  LuHardDrive: 'Storage',
  LuHardDriveDownload: 'Storage',
  LuHardDriveUpload: 'Storage',
  LuArrowDown: 'Network',
  LuArrowUp: 'Network',
  LuNetwork: 'Network',
  LuActivity: 'System',
  LuArrowLeftRight: 'System',
  LuBox: 'Pods',
  LuServer: 'Nodes',
  LuRotateCcw: 'Lifecycle',
  LuPlay: 'Status',
  LuClock: 'Lifecycle',
  LuAlertTriangle: 'Lifecycle',
};

export const CATEGORY_ORDER = [
  'CPU',
  'Memory',
  'Storage',
  'Network',
  'System',
  'Pods',
  'Nodes',
  'Lifecycle',
  'Status',
  'Other',
];

// ---------------------------------------------------------------------------
// Static styles
// ---------------------------------------------------------------------------

export const gaugeWrapperStyle: React.CSSProperties = { minWidth: 0, flex: 1 };
export const gaugeHeaderStyle: React.CSSProperties = { marginBottom: 2 };
export const gaugeValueStyle: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export const tileStyle: React.CSSProperties = {
  paddingBlock: 6,
  paddingInline: 8,
  borderRadius: 4,
  border: '1px solid var(--ov-color-border-default)',
  background: 'var(--ov-color-bg-surface-raised)',
};
export const tileLabelStyle: React.CSSProperties = { marginBottom: 2, display: 'block' };
export const tileValueStyle: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export const pageRootStyle: React.CSSProperties = { padding: 8 };
export const noProvidersStyle: React.CSSProperties = { padding: 16 };
export const loadingStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', paddingBlock: 32 };
export const noDataStyle: React.CSSProperties = { padding: 16 };
export const errorBannerStyle: React.CSSProperties = { marginBottom: 8 };
export const refreshBarStyle: React.CSSProperties = { marginBottom: 4 };
export const chartsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
  gap: 8,
  marginBottom: 12,
};
export const tileGroupWrapperStyle: React.CSSProperties = { paddingInline: 4 };
export const tileCategoryLabelStyle: React.CSSProperties = {
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontSize: '0.6rem',
  marginBottom: 4,
};
export const percentGaugeStackStyle: React.CSSProperties = { marginBottom: 4, gap: 6 };
export const timeRangePickerStyle: React.CSSProperties = { marginBottom: 8 };
/** 12-column grid matching the old MUI Grid (spacing 0.5). */
export const tileGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
  gap: 4,
};
