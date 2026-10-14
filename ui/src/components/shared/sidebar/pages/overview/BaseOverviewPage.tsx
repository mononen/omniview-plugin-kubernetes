import { Stack } from '@omniviewdev/base-ui';
import React from 'react';

// project-imports
import { KubernetesResourceObject } from '../../../../../types/resource';

import MetadataSection from './sections/MetadataSection';

interface Props {
  data: KubernetesResourceObject;
  children?: React.ReactNode;
}

const rootStyle: React.CSSProperties = { width: '100%' };

export const BaseOverviewPage: React.FC<Props> = ({ data, children }) => {
  if (!data) {
    console.warn('BaseOverviewPage: no data provided');
    return null;
  }

  // compose your component here
  return (
    <Stack direction="column" spacing={2} style={rootStyle}>
      <MetadataSection data={data.metadata} />
      {children}
    </Stack>
  );
};

BaseOverviewPage.displayName = 'BaseOverviewPage';
export default BaseOverviewPage;
