import { MultiSelect } from '@omniviewdev/base-ui';
import { useKubernetesResources } from '../../hooks/useKubernetesResources';
import type { Namespace } from 'kubernetes-types/core/v1';
import React from 'react';

import styles from './toolbarInputs.module.css';
import { SourcePageControls } from '../shared/SourcePageControls';

type Props = {
  /** The active connection being used */
  connectionID: string;

  /** The currently selected namespaces. */
  selected: string[];

  /** Set the selected namespaces. */
  setNamespaces: (namespaces: string[]) => void;
};

/**
 * Renders a select for choosing namespaces.
 * Reads one bounded namespace page. Selected names remain available across pages.
 */
const NamespaceSelect: React.FC<Props> = ({ connectionID, selected, setNamespaces }) => {
  const { bodies, pageControls } = useKubernetesResources<Namespace>({
    connectionID,
    resourceType: 'k8s:/namespaces',
  });

  const namespaceNames = React.useMemo(() => {
    const items = bodies;
    return [...new Set([
      ...selected,
      ...items.map((ns) => ns.metadata?.name).filter((name): name is string => Boolean(name)),
    ])].sort();
  }, [bodies, selected]);

  return (
    <div>
    <MultiSelect
      size="sm"
      variant="outline"
      items={namespaceNames}
      value={selected}
      onValueChange={(values) => setNamespaces(values)}
      placeholder="All Namespaces"
      searchPlaceholder="Search namespaces..."
      triggerLabel="Namespaces"
      maxVisibleChips={2}
      clearable
      className={styles.filterSelect}
    />
      <SourcePageControls {...pageControls} label="Namespaces" />
    </div>
  );
};

export default NamespaceSelect;
