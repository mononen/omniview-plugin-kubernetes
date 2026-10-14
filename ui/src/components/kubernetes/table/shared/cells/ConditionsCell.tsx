import { Condition } from 'kubernetes-types/meta/v1';

import ConditionChip from '../../../../shared/ConditionChip';

import styles from './cells.module.css';

const conditionsRowStyle = { justifyContent: 'flex-start', gap: 4 } as const;

type Props = {
  conditions: Array<Condition> | undefined;

  /**
   * The default healthy color to use for all the conditions.
   * TODO: change so we can supply a map of status types
   */
  defaultHealthyColor?: 'success' | 'neutral';

  /**
   * The default healthy color to use for all the conditions.
   * TODO: change so we can supply a map of status types
   */
  defaultUnhealthyColor?: 'warning' | 'danger' | 'faded';
};

/**
 * Render a list of conditions for the table columns. The conditions here should
 * come from the status cell
 */
const ConditionsCell: React.FC<Props> = ({
  conditions,
  defaultHealthyColor,
  defaultUnhealthyColor,
}) => {
  if (!conditions) {
    return null;
  }

  return (
    <div className={styles.scrollRow} style={conditionsRowStyle}>
      {conditions
        .filter((condition) => condition.status === 'True')
        .map((condition) => (
          <ConditionChip
            key={condition.type}
            condition={condition}
            healthyColor={defaultHealthyColor}
            unhealthyColor={defaultUnhealthyColor}
          />
        ))}
    </div>
  );
};

export default ConditionsCell;
