import { MultiSelect } from '@omniviewdev/base-ui';
import React from 'react';

import styles from './toolbarInputs.module.css';

type Props = {
  /** Raw table data used to derive the set of available options. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  /** Extracts the filterable string value from a single data row. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accessor: (row: any) => string | undefined;
  /** Currently selected filter values. */
  value: string[];
  /** Called when the selection changes. */
  onChange: (values: string[]) => void;
  /** Placeholder shown when nothing is selected (e.g. "All Nodes"). */
  placeholder: string;
};

/**
 * Generic multi-select dropdown that derives its option list from the live
 * table data via the provided accessor. Matches the same compact style as
 * NamespaceSelect so the toolbar dropdowns look uniform.
 */
const ResourceFilterSelect: React.FC<Props> = ({ data, accessor, value, onChange, placeholder }) => {
  const options = React.useMemo(() => {
    const set = new Set<string>();
    for (const row of data) {
      const v = accessor(row);
      if (v) {
        set.add(v);
      }
    }
    return [...set].sort();
  }, [data, accessor]);

  return (
    <MultiSelect
      size="sm"
      variant="outline"
      items={options}
      value={value}
      onValueChange={(values) => onChange(values)}
      placeholder={placeholder}
      triggerLabel={placeholder}
      maxVisibleChips={2}
      clearable
      className={styles.filterSelect}
    />
  );
};

export default ResourceFilterSelect;
