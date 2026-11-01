import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HostRecord } from '@omniviewdev/runtime';

const decode = vi.hoisted(() => vi.fn());
vi.mock('@omniviewdev/runtime', () => ({ valueToJSON: decode }));
import { decodeResourceTableRows } from './rows';

function record(key: string, namespace: string, targetId = 'table'): HostRecord {
  return {
    key, addressKey: `address-${namespace}`, targetId, route: { connection: 'cluster-route' },
    record: {
      reference: {
        address: { provider: 'kubernetes', authority: 'cluster-authority', type: 'k8s:/pods', scope: [{ dimension: 'namespace', value: namespace }], id: 'api' },
        incarnation: 'native-uid',
      },
      body: { kind: 'map', value: {} },
      representation: { id: 'native-json', revision: 'schema-revision', schema: { state: 'absent', validation: 'dynamic', unvalidated: [] } },
      coverage: { kind: 'complete', paths: [] },
    },
  };
}

describe('decodeResourceTableRows', () => {
  beforeEach(() => decode.mockReset());

  it('uses host membership keys, never body UID or name', () => {
    const first = record('host-row-one', 'one');
    const second = record('host-row-two', 'two');
    const firstBody = { metadata: { name: 'api', namespace: 'one', uid: 'same-body-uid' } };
    const secondBody = { metadata: { name: 'api', namespace: 'two', uid: 'same-body-uid' } };
    decode.mockReturnValueOnce(firstBody).mockReturnValueOnce(secondBody);
    const rows = decodeResourceTableRows([first, second]);
    expect(rows.rowKeys).toEqual(['host-row-one', 'host-row-two']);
    expect(rows.recordsByBody.get(rows.rows[0])).toBe(first);
    expect(rows.recordsByBody.get(rows.rows[1])).toBe(second);
  });

  it('retains equal addresses in separate target memberships and preserves incarnation', () => {
    const first = record('first-membership', 'one', 'first');
    const second = { ...first, key: 'second-membership', targetId: 'second' };
    decode.mockReturnValueOnce({ metadata: { name: 'api' } }).mockReturnValueOnce({ metadata: { name: 'api' } });
    const rows = decodeResourceTableRows([first, second]);
    expect(rows.rowKeys).toEqual(['first-membership', 'second-membership']);
    expect(rows.recordsByBody.get(rows.rows[1])?.record.reference.incarnation).toBe('native-uid');
  });
});
