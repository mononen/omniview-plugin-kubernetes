import { Separator, Stack, Text } from '@omniviewdev/base-ui';
import type { Node } from 'kubernetes-types/core/v1';
import React from 'react';

import SectionEntry from '../shared/SectionEntry';
import { sectionBodyStyle, sectionBorderStyle, sectionTitleStyle } from '../shared/sectionStyles';

interface Props {
  node: Node;
}

const InfoEntry: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <SectionEntry label={label} value={value} truncate />
);

const NodeSystemSection: React.FC<Props> = ({ node }) => {
  const info = node.status?.nodeInfo;
  if (!info) return null;

  return (
    <div style={sectionBorderStyle}>
      <div style={sectionTitleStyle}>
        <Stack direction="row" spacing={0} align="center" style={{ gap: 6 }}>
          <Text weight="semibold" size="sm">
            System
          </Text>
        </Stack>
      </div>
      <Separator />
      <div style={sectionBodyStyle}>
        <InfoEntry label="OS" value={info.operatingSystem} />
        <InfoEntry label="OS Image" value={info.osImage} />
        <InfoEntry label="Architecture" value={info.architecture} />
        <InfoEntry label="Kernel" value={info.kernelVersion} />
        <InfoEntry label="Runtime" value={info.containerRuntimeVersion} />
        <InfoEntry label="Kubelet" value={info.kubeletVersion} />
        <InfoEntry label="Kube Proxy" value={info.kubeProxyVersion} />
        <InfoEntry label="Machine ID" value={info.machineID} />
      </div>
    </div>
  );
};

export default NodeSystemSection;
