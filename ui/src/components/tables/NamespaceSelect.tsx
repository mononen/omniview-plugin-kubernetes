import { MultiSelect } from '@omniviewdev/base-ui';
import { useKubernetesResources } from '../../hooks/useKubernetesResources';
import type { Namespace } from 'kubernetes-types/core/v1';
import React from 'react';

import styles from './toolbarInputs.module.css';

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
 * Subscribes to canonical best-effort namespace updates through the Kubernetes adapter.
 */
const NamespaceSelect: React.FC<Props> = ({ connectionID, selected, setNamespaces }) => {
  const { bodies } = useKubernetesResources<Namespace>({
    connectionID,
    resourceType: 'k8s:/namespaces',
  });

  const namespaceNames = React.useMemo(() => {
    const items = bodies;
    return items
      .map((ns) => ns.metadata?.name)
      .filter((name): name is string => Boolean(name))
      .sort();
  }, [bodies]);

  return (
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
  );
};

export default NamespaceSelect;
