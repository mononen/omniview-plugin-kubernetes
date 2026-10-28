import { describe, expect, it } from 'vitest';
import { metricQueryParams } from './metricParams';

describe('Prometheus utility parameter metadata', () => {
  it('keeps useful per-connection overrides as string parameters', () => {
    expect(metricQueryParams({ prometheusService: 'prometheus-operated', prometheusNamespace: 'observability', prometheusPort: 9090 })).toEqual({
      prometheus_service_name: 'prometheus-operated',
      prometheus_service_namespace: 'observability',
      prometheus_service_port: '9090',
    });
  });

  it('omits unset overrides rather than fabricating empty resource data', () => {
    expect(metricQueryParams()).toBeUndefined();
    expect(metricQueryParams({})).toBeUndefined();
    expect(metricQueryParams({ prometheusService: '', prometheusNamespace: '', prometheusPort: 0 })).toBeUndefined();
    expect(metricQueryParams({ prometheusNamespace: 'custom' })).toEqual({ prometheus_service_namespace: 'custom' });
  });
});
