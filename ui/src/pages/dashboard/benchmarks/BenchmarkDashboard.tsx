import React from 'react';

import ClusterOverviewCard from './components/ClusterOverviewCard';

type Props = {
  connectionID: string;
  connectionAvatar?: string;
  data: object;
};

const BenchmarkDashboard: React.FC<Props> = ({ data, connectionID, connectionAvatar }) => {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <ClusterOverviewCard
          cluster={connectionID}
          icon={connectionAvatar || 'SiKubernetes'}
          passing={4}
          warning={5}
          failing={6}
          score={87.9}
        />
        <div>
          <pre>{JSON.stringify(data, null, '\t')}</pre>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkDashboard;
