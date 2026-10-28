import type { DrawerContext } from '@omniviewdev/runtime';

type NativeFixture = { metadata?: { name?: string; namespace?: string; uid?: string } };

/** Explicit mock host identity for isolated stories and component fixtures only. */
export function fixtureResource(type: string, data: unknown, connection: string, id: string): NonNullable<DrawerContext['resource']> {
  const metadata = (data as NativeFixture | undefined)?.metadata;
  return {
    pluginID: 'kubernetes',
    reference: {
      address: {
        provider: 'kubernetes', authority: 'fixture-host-authority', type,
        scope: metadata?.namespace ? [{ dimension: 'namespace', value: metadata.namespace }] : [],
        id,
      },
      ...(metadata?.uid ? { incarnation: metadata.uid } : {}),
    },
    route: { connection },
    targetId: 'fixture-host-target', representation: 'fixture-native-document',
    key: 'fixture-host-row', name: metadata?.name ?? id,
  };
}
