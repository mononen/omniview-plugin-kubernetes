import type React from 'react';

export const resourceKey = 'helm::v1::Repository';

export const dialogStyle: React.CSSProperties = {
  width: '90%',
  maxWidth: 560,
  maxHeight: '85vh',
};
export const validatingContainerStyle: React.CSSProperties = { padding: '32px 0' };
export const authFieldsStyle: React.CSSProperties = { paddingTop: 8, paddingLeft: 20 };
export const errorCardStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 4,
  borderColor: 'var(--ov-color-danger)',
};
export const successCardStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 4,
  borderColor: 'var(--ov-color-success)',
};
export const successIconStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  backgroundColor: 'var(--ov-color-success)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
export const chartNameStyle: React.CSSProperties = { lineHeight: 1.3 };
export const chartDescStyle: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: 1.3,
};
export const chartVersionTextStyle: React.CSSProperties = { flexShrink: 0 };
export const chartDetailColumnStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
export const miniChartIconContainerStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '4px',
  flexShrink: 0,
  backgroundColor: 'var(--ov-color-state-hover)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
export const miniChartImgStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  objectFit: 'contain',
  borderRadius: '3px',
};
export const miniChartFallbackStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '4px',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 9,
  fontWeight: 700,
  color: '#fff',
  lineHeight: 1,
};
