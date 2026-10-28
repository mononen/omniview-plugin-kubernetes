import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DrawerContext } from '@omniviewdev/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ metrics: vi.fn(), forward: vi.fn(), close: vi.fn() }));
vi.mock('@omniviewdev/runtime', () => ({
  useResourceMetrics: (options: unknown) => {
    calls.metrics(options);
    return { providers: [], data: undefined, isLoading: false };
  },
  useResourcePortForwarder: () => ({ sessions: { data: [] }, forward: calls.forward, close: calls.close }),
}));
vi.mock('@omniviewdev/runtime/runtime', () => ({ Browser: { OpenURL: vi.fn() } }));
vi.mock('../../hooks/useClusterPreferences', () => ({
  useClusterPreferences: () => ({ connectionOverrides: { prod: { metricConfig: {
    prometheusService: 'custom-prometheus', prometheusNamespace: 'observability', prometheusPort: 9091,
  } } } }),
}));
vi.mock('./charts', () => ({ MetricsPanel: () => null, TimeRangePicker: () => null }));
import ResourceMetricsPage from './sidebar/pages/metrics/ResourceMetricsPage';
import WorkloadPortsCard from './WorkloadPortsCard';
import PortDetailsCard from '../kubernetes/sidebar/Pod/PortDetailsCard';
import ClusterResourceGauges from '../../pages/dashboard/overview/components/ClusterResourceGauges';
import ClusterMetricsSection from '../../pages/dashboard/overview/components/ClusterMetricsSection';

const body = { kind: 'map', value: { wide: { kind: 'int64', value: '9007199254740993' } } } as const;
const reference = { address: { provider: 'kubernetes', authority: 'host-authority', type: 'k8s:/pods', id: 'api', scope: [] } };
const route = { connection: 'prod' };
const resource = {
  pluginID: 'kubernetes', reference, route, targetId: 'host-target', representation: 'native',
  record: { key: 'host-key', addressKey: 'host-address', targetId: 'host-target', route,
    record: { body, reference, representation: { id: 'native', revision: '1', schema: { state: 'none', validation: 'none', unvalidated: [] } }, coverage: { kind: 'complete', paths: [], reason: '' } } },
} as NonNullable<DrawerContext['resource']>;
const ports = [{ containerPort: 8080, protocol: 'TCP' }];

beforeEach(() => { calls.metrics.mockClear(); calls.forward.mockReset().mockResolvedValue(undefined); });
afterEach(cleanup);

describe('native resource utility inputs', () => {
  it('uses canonical observation for both metric shapes, not drawer display data', () => {
    render(<ResourceMetricsPage ctx={{ data: { metadata: { name: 'display-only' } }, resource }} />);
    expect(calls.metrics).toHaveBeenCalledTimes(2);
    for (const [options] of calls.metrics.mock.calls) {
      expect(options.resourceData).toBe(body);
      expect(options.reference).toBe(reference);
      expect(options.route).toBe(route);
      expect(options.params).toEqual({
        prometheus_service_name: 'custom-prometheus',
        prometheus_service_namespace: 'observability',
        prometheus_service_port: '9091',
      });
    }
  });
  it.each(['gauges', 'charts'])('keeps cluster %s overrides outside resource observations', (kind) => {
    const metricConfig = { prometheusService: 'custom-prometheus', prometheusNamespace: 'observability', prometheusPort: 9091 };
    render(kind === 'gauges'
      ? <ClusterResourceGauges connectionID="prod" metricConfig={metricConfig} />
      : <ClusterMetricsSection connectionID="prod" namespace="" metricConfig={metricConfig}
          timeRange={{ from: new Date(0), to: new Date(1000) }} onTimeRangeChange={() => {}} />);
    expect(calls.metrics).toHaveBeenCalledTimes(kind === 'gauges' ? 1 : 2);
    for (const [options] of calls.metrics.mock.calls) {
      expect(options.params).toEqual({
        prometheus_service_name: 'custom-prometheus',
        prometheus_service_namespace: 'observability',
        prometheus_service_port: '9091',
      });
      expect(options).not.toHaveProperty('resourceData');
      expect(options).not.toHaveProperty('reference');
      expect(options).not.toHaveProperty('route');
    }
  });


  it.each(['pod', 'workload'])('forwards canonical %s body/reference/route', async (kind) => {
    render(kind === 'pod'
      ? <PortDetailsCard data={ports} resource={resource} resourceID="api" connectionID="prod" />
      : <WorkloadPortsCard podSpec={{ containers: [{ name: 'main', ports }] }} resource={resource} resourceKey="k8s:/pods" resourceID="api" connectionID="prod" />);
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Forward' })).toHaveLength(2));
    fireEvent.click(screen.getAllByRole('button', { name: 'Forward' })[1]);
    expect(calls.forward).toHaveBeenCalledWith({ opts: expect.objectContaining({
      resource: body, reference, route, remotePort: 8080,
    }) });
    expect(calls.forward.mock.calls[0][0].opts.resource).toBe(body);
  });
});
