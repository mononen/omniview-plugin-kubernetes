import * as React from 'react';

import { DonutChart } from '../../../../components/shared/charts';
import type { DonutSegment } from '../../../../components/shared/charts';

type Props = {
  label: string;
  success: number;
  warning: number;
  failure: number;
};

const chartStyle: React.CSSProperties = { minWidth: 140 };

export const ScorecardChart: React.FC<Props> = ({ label, success, warning, failure }) => {
  const segments = React.useMemo<DonutSegment[]>(
    () => [
      { value: success, color: 'var(--ov-color-success)', label: 'Passing' },
      { value: warning, color: 'var(--ov-color-warning)', label: 'Warning' },
      { value: failure, color: 'var(--ov-color-danger)', label: 'Failing' },
    ],
    [success, warning, failure],
  );

  return (
    <DonutChart
      segments={segments}
      innerRadius={36}
      outerRadius={50}
      paddingAngle={2}
      height={140}
      centerLabel={label}
      style={chartStyle}
    />
  );
};

export default ScorecardChart;
