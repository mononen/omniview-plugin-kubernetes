import { type RowSelectionState } from '@tanstack/react-table';
import { useEffect, useMemo } from 'react';

/**
 * Prune selected host row keys when records leave the current resource set.
 * This keeps select-all and row highlights aligned without using body fields
 * as generic identity.
 */
export function useRowSelectionCleanup(
  rowKeys: readonly string[],
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>,
) {
  const validRowIds = useMemo(() => new Set(rowKeys), [rowKeys]);

  useEffect(() => {
    setRowSelection((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;

      const pruned: RowSelectionState = {};
      let changed = false;
      for (const key of keys) {
        if (validRowIds.has(key)) {
          pruned[key] = true;
        } else {
          changed = true;
        }
      }
      return changed ? pruned : prev;
    });
  }, [validRowIds, setRowSelection]);
}
