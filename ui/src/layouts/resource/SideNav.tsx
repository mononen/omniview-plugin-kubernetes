import React from 'react';

import styles from './Layout.module.css';

type Props = {
  /** Padding in MUI spacing units (1 = 8px), kept for compatibility. */
  padding?: number;
  width?: number;
  type?: 'inset' | 'bordered' | 'transparent' | 'bordered-inset';
  scrollable?: boolean;
  children: React.ReactNode;
};

const typeClass: Record<NonNullable<Props['type']>, string> = {
  bordered: styles.Bordered,
  inset: styles.Inset,
  transparent: styles.Transparent,
  'bordered-inset': styles.BorderedInset,
};

/**
 * The side navigation component for the sidenav layout
 */
const SideNav: React.FC<Props> = ({
  type = 'inset',
  scrollable = false,
  children,
  width,
  padding,
}) => {
  const style = {
    padding: (padding ?? 0) * 8,
    ...(width !== undefined
      ? {
        '--_sidenav-w-xs': `${width}px`,
        '--_sidenav-w-sm': `${width}px`,
        '--_sidenav-w-md': `${width}px`,
        '--_sidenav-w-lg': `${width}px`,
      }
      : {}),
  } as React.CSSProperties;

  return (
    <nav
      className={['Navigation', styles.SideNav, typeClass[type], scrollable && styles.Scrollable]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </nav>
  );
};

export default SideNav;
