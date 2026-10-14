import { Separator, Stack, Text } from '@omniviewdev/base-ui';
import type { Node } from 'kubernetes-types/core/v1';
import React from 'react';

import SectionEntry from '../shared/SectionEntry';
import { sectionBodyStyle, sectionBorderStyle, sectionTitleStyle } from '../shared/sectionStyles';

const karpenterDividerStyle: React.CSSProperties = { marginBlock: 4 };
const karpenterLabelStyle: React.CSSProperties = { fontStyle: 'italic' };
const karpenterHeaderStyle: React.CSSProperties = { marginBottom: 2 };

interface Props {
  node: Node;
}

const TopologyEntry: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <SectionEntry label={label} value={value} truncate />
);

const NodeTopologySection: React.FC<Props> = ({ node }) => {
  const labels = node.metadata?.labels || {};
  const cloud = node.spec?.providerID?.split(':')[0] || '';
  const region = labels['topology.kubernetes.io/region'] || '';
  const zone = labels['topology.kubernetes.io/zone'] || '';
  const instanceType = labels['node.kubernetes.io/instance-type'] || '';

  // Hide if no topology info is available.
  if (!cloud && !region && !zone && !instanceType) return null;

  // Karpenter labels (conditional).
  const karpenterFamily = labels['karpenter.k8s.aws/instance-family'];
  const karpenterSize = labels['karpenter.k8s.aws/instance-size'];
  const karpenterCapacityType = labels['karpenter.sh/capacity-type'];
  const karpenterProvisioner = labels['karpenter.sh/provisioner-name'];
  const hasKarpenter = !!labels['karpenter.sh/initialized'];

  return (
    <div style={sectionBorderStyle}>
      <div style={sectionTitleStyle}>
        <Text weight="semibold" size="sm">
          Topology
        </Text>
      </div>
      <Separator />
      <div style={sectionBodyStyle}>
        <TopologyEntry label="Cloud" value={cloud} />
        <TopologyEntry label="Region" value={region} />
        <TopologyEntry label="Zone" value={zone} />
        <TopologyEntry label="Instance" value={instanceType} />
        {hasKarpenter && (
          <>
            <div style={karpenterDividerStyle}>
              <Separator />
            </div>
            <Stack direction="row" spacing={1} align="center" style={karpenterHeaderStyle}>
              <Text size="xs" tone="subtle" style={karpenterLabelStyle}>
                Karpenter
              </Text>
            </Stack>
            <TopologyEntry label="Family" value={karpenterFamily} />
            <TopologyEntry label="Size" value={karpenterSize} />
            <TopologyEntry label="Capacity" value={karpenterCapacityType} />
            <TopologyEntry label="Provisioner" value={karpenterProvisioner} />
          </>
        )}
      </div>
    </div>
  );
};

export default NodeTopologySection;
