import React from 'react';

const mainStyle: React.CSSProperties = { width: '100%', overflow: 'hidden', flex: 1 };

/**
 * The main component for the sidenav layout.
 */
const Main: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className, style, ...props }) => (
  <main
    {...props}
    className={className ? `Main ${className}` : 'Main'}
    style={{ ...mainStyle, ...style }}
  />
);

export default Main;
