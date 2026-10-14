import { Chip } from '@omniviewdev/base-ui';

import styles from './cells.module.css';
import { squareChipStyle } from './styles';

const chipListStyle = { gap: 2 } as const;

type Props = {
  values: string[];
};

export const ChipListCell = ({ getValue }: { getValue: () => unknown }) => {
  const val = getValue();
  if (!Array.isArray(val) || val.length === 0) {
    return null;
  }

  return <ChipList values={val as string[]} />;
};

const ChipList: React.FC<Props> = ({ values }) => {
  return (
    <div className={styles.scrollRow} style={chipListStyle}>
      {values.map((value) => (
        <Chip key={value} size="sm" variant="outline" style={squareChipStyle}>
          {value}
        </Chip>
      ))}
    </div>
  );
};

export default ChipList;
