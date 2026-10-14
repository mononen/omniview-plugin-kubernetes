import React from 'react';

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 1200,
  width: '100%',
  height: '100%',
};

const backdropStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
};

const drawerContentStyle: React.CSSProperties = {
  position: 'relative',
  minWidth: 256,
  width: 'max-content',
  height: '100%',
  padding: 16,
  boxShadow: '0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12)',
  backgroundColor: 'var(--ov-color-bg-surface)',
};

type Props = React.HTMLAttributes<HTMLDivElement> & {
  onClose: React.MouseEventHandler<HTMLDivElement>;
};

/**
 * An optional side drawer component for the sidenav layout.
 */
const SideDrawer: React.FC<Props> = ({ onClose, style, children, ...props }) => (
  <div {...props} style={{ ...containerStyle, ...style }}>
    <div
      role="button"
      tabIndex={0}
      aria-label="Close drawer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          onClose(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      style={backdropStyle}
    />
    <div style={drawerContentStyle}>{children}</div>
  </div>
);

export default SideDrawer;
