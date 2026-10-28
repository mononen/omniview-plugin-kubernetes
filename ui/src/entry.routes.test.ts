import { readFileSync } from 'node:fs';
import { matchRoutes, type RouteObject } from 'react-router-dom';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// Evaluate the actual registration array without mounting unrelated plugin services.
const source = ts.createSourceFile('entry.ts', readFileSync(new URL('./entry.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
let registration: ts.Expression | undefined;
const names = new Set<string>(['connectionSearchHandle']);
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'routes') registration = node.initializer;
  if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'Component') names.add(node.initializer.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);
if (!registration) throw new Error('Route registration is missing');
const components = Object.fromEntries([...names].map((name) => [name, () => null]));
const routes: RouteObject[] = new Function(...names, `return (${registration.getText(source)});`)(...Object.values(components));

describe('native specialized route registrations', () => {
  it.each([
    ['k8s:/pods', 'PodTable'],
    ['k8s:/nodes', 'NodeTable'],
    ['k8s:apps/deployments', 'DeploymentTable'],
    ['helm:releases', 'HelmReleaseTable'],
    ['helm:repositories', 'HelmRepoTable'],
    ['helm:charts', 'HelmChartTable'],
  ])('matches encoded canonical Type %s using installed React Router', (type, component) => {
    const matches = matchRoutes(routes, `/cluster/prod/resources/${encodeURIComponent(type)}`);
    expect(matches?.at(-1)?.route.Component).toBe(components[component]);
  });

  it('requires Type slash encoding instead of changing route structure', () => {
    expect(matchRoutes(routes, '/cluster/prod/resources/k8s:/pods')).toBeNull();
    expect(matchRoutes(routes, '/cluster/prod/resources/k8s:%2Fpods')?.at(-1)?.route.Component).toBe(components.PodTable);
  });

  it('leaves unknown encoded Types to generic route', () => {
    const matches = matchRoutes(routes, `/cluster/prod/resources/${encodeURIComponent('k8s:example.io/widgets')}`);
    expect(matches?.at(-1)?.route.Component).toBe(components.DefaultTable);
    expect(matches?.at(-1)?.params.resourceKey).toBe('k8s:example.io/widgets');
  });
});
