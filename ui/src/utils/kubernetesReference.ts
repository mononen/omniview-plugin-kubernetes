import { ResourceClient } from '@omniviewdev/runtime/api';

/** Resolve native Kubernetes links through the host's admitted catalog and authority. */
export async function resolveKubernetesReference({ connectionID, resourceType, name, namespace, incarnation }: {
  connectionID: string;
  resourceType: string;
  name: string;
  namespace?: string;
  incarnation?: string;
}) {
  const route = { connection: connectionID };
  const catalog = await ResourceClient.Catalog('kubernetes', { route });
  const type = catalog.types.find((entry) => entry.type === resourceType);
  if (!type) throw new Error(`Resource type is unavailable: ${resourceType}`);
  const scope = type.identityDimensions.map((dimension) => {
    if (dimension.name !== 'namespace') throw new Error(`Unsupported Kubernetes identity dimension: ${dimension.name}`);
    if (!namespace) throw new Error('A namespace is required for this Kubernetes resource');
    return { dimension: dimension.name, value: namespace };
  });
  return ResourceClient.ResolveReference('kubernetes', { route, type: resourceType, scope, id: name, incarnation });
}
