import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { getTemplate, templateIdentity } from './templates';

describe('native create templates', () => {
  it('uses the exact selected schema root and native group/version/kind', () => {
    const document = { components: { schemas: {
      'custom/Widget': { 'x-kubernetes-group-version-kind': [{ group: 'example.test', version: 'v7', kind: 'Widget' }] },
      other: { 'x-kubernetes-group-version-kind': [{ group: '', version: 'v1', kind: 'Pod' }] },
    } } };
    const identity = templateIdentity(document, '#/components/schemas/custom~1Widget', true);
    expect(identity).toEqual({ apiVersion: 'example.test/v7', kind: 'Widget', namespaced: true });
    expect(parse(getTemplate(identity))).toEqual({
      apiVersion: 'example.test/v7', kind: 'Widget', metadata: { name: 'my-widget', namespace: 'default' },
    });
  });

  it('keeps useful native examples but replaces version and respects catalog scope', () => {
    const body = parse(getTemplate({ apiVersion: 'apps/v9', kind: 'Deployment', namespaced: false }));
    expect(body.apiVersion).toBe('apps/v9');
    expect(body.kind).toBe('Deployment');
    expect(body.spec.template.spec.containers[0].image).toBe('nginx:latest');
    expect(body.metadata.namespace).toBeUndefined();
  });

  it('does not invent identity when the schema is missing or ambiguous', () => {
    expect(templateIdentity({}, '#/missing', false)).toBeUndefined();
    expect(templateIdentity({ 'x-kubernetes-group-version-kind': [
      { group: '', version: 'v1', kind: 'Pod' }, { group: 'other', version: 'v2', kind: 'Pod' },
    ] }, '#', true)).toBeUndefined();
    expect(parse(getTemplate())).toBeNull();
    expect(getTemplate()).toContain('Paste a complete Kubernetes YAML manifest');
  });
});
