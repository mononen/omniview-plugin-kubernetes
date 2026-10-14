import React, { useMemo } from 'react';

import styles from './Charts.module.css';
import { arcPath, computeDonutArcs, resolveChartColor } from './scales';
import type { DonutSegment } from './types';

export interface DonutChartProps {
  segments: DonutSegment[];
  /** SVG height in px; the donut is centred horizontally in the available width. */
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  /** Gap between slices, in degrees. */
  paddingAngle?: number;
  /** Text drawn in the centre. */
  centerLabel?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Plain-SVG donut (innerRadius 0 gives a pie). */
const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  height = 140,
  innerRadius = 36,
  outerRadius = 50,
  paddingAngle = 2,
  centerLabel,
  className,
  style,
}) => {
  const size = Math.max(height, outerRadius * 2);
  const c = size / 2;
  const arcs = useMemo(
    () =>
      computeDonutArcs(segments, (paddingAngle * Math.PI) / 180).map((a) => ({
        key: a.index,
        d: arcPath(c, c, innerRadius, outerRadius, a.start, a.end),
        color: resolveChartColor(segments[a.index].color),
        label: segments[a.index].label,
        value: segments[a.index].value,
      })),
    [segments, paddingAngle, c, innerRadius, outerRadius],
  );

  return (
    <svg
      className={className}
      style={{ display: 'block', width: '100%', ...style }}
      height={height}
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      {arcs.length === 0 && (
        <circle cx={c} cy={c} r={(innerRadius + outerRadius) / 2} style={{ fill: 'none', stroke: 'var(--ov-color-border-default)' }} strokeWidth={outerRadius - innerRadius} />
      )}
      {arcs.map((a) => (
        <path key={a.key} d={a.d} style={{ fill: a.color, stroke: a.color }} strokeWidth={1} strokeLinejoin="round">
          {a.label != null && <title>{`${a.label}: ${a.value}`}</title>}
        </path>
      ))}
      {centerLabel != null && (
        <text className={styles.donutLabel} x={c} y={c}>
          {centerLabel}
        </text>
      )}
    </svg>
  );
};

DonutChart.displayName = 'DonutChart';

export default DonutChart;
