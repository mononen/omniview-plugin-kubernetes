import { valueToJSON, type Value } from '@omniviewdev/runtime';
import { parse } from 'yaml';

/** Helm action payloads retain their native data envelope inside canonical Value. */
export function helmActionData(value: Value): unknown {
  const result = valueToJSON(value);
  if (result === null || typeof result !== 'object' || !('data' in result)) return undefined;
  return result.data;
}

/** Keep authored YAML integer scalars exact when converting them to SDK Value. */
export function helmValues(text: string): unknown {
  if (!text.trim()) return {};
  const value: unknown = parse(text, { intAsBigInt: true });
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Helm values must be a YAML object');
  }
  return value;
}
