import type { MetricConfig } from '../types/clusters';

/** Per-connection utility options are metadata, never part of a resource observation. */
export function metricQueryParams(config?: MetricConfig): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (config?.prometheusService) params.prometheus_service_name = config.prometheusService;
  if (config?.prometheusNamespace) params.prometheus_service_namespace = config.prometheusNamespace;
  if (config?.prometheusPort) params.prometheus_service_port = String(config.prometheusPort);
  return Object.keys(params).length > 0 ? params : undefined;
}
