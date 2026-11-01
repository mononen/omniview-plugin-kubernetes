import type { DrawerContext } from '@omniviewdev/runtime';
import { Grid } from '@omniviewdev/base-ui';
import type { Container } from 'kubernetes-types/core/v1';
import React from 'react';

import PortDetailsCard from '../PortDetailsCard';

export interface ContainerPortsSectionProps {
  resourceID: string;
  connectionID: string;
  container: Container;
  resource?: DrawerContext['resource'];
}

const ContainerPortsSection: React.FC<ContainerPortsSectionProps> = ({
  resourceID,
  connectionID,
  container,
  resource,
}) => {
  if (!container.ports || container.ports.length === 0) return null;

  return (
    <Grid.Item span={12}>
      <PortDetailsCard
        resourceID={resourceID}
        connectionID={connectionID}
        title="Ports"
        icon="LuNetwork"
        titleSize="sm"
        data={container.ports}
        resource={resource}
      />
    </Grid.Item>
  );
};

export default ContainerPortsSection;
