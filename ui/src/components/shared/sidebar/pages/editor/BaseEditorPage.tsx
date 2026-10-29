import { Button, Stack } from '@omniviewdev/base-ui';
import { jsonToValue, valueToJSON, useResourceMutations, useResourceTypes, type DrawerContext } from '@omniviewdev/runtime';
import React from 'react';
import { LuFileCode, LuSave, LuX } from 'react-icons/lu';
import { stringify, parse } from 'yaml';

import { KubernetesResourceObject } from '../../../../../types/resource';
import CodeEditor from '../../../CodeEditor';

const outerStackStyle: React.CSSProperties = { flex: 1 };
type Resource = NonNullable<DrawerContext['resource']>;
interface Props { ctx: DrawerContext<KubernetesResourceObject> }

/** Requires the original contextual identity; never derives a write target from YAML. */
export const BaseEditorPage: React.FC<Props> = ({ ctx }) => {
  if (!ctx.resource || !ctx.data) {
    return <div role="alert">Resource identity and data are required to edit this resource.</div>;
  }
  const key = JSON.stringify([ctx.resource.pluginID, ctx.resource.targetId, ctx.resource.route, ctx.resource.reference, ctx.resource.representation]);
  return <ResourceEditor key={key} data={ctx.data} resource={ctx.resource} />;
};

const ResourceEditor: React.FC<{ data: KubernetesResourceObject; resource: Resource }> = ({ data, resource }) => {
  const { mutate } = useResourceMutations({ pluginID: resource.pluginID });
  const { resourceTypes } = useResourceTypes({ pluginID: resource.pluginID, route: resource.route });
  const descriptor = resourceTypes.data?.find((type) => type.type === resource.reference.address.type);
  const canUpdate = descriptor?.capabilities.some((capability) => capability.operation === 'update'
    && capability.scope.every((constraint) => constraint.match === 'any'
      || resource.reference.address.scope.some((entry) => entry.dimension === constraint.dimension && constraint.values.includes(entry.value))));
  const [baseline, setBaseline] = React.useState(() => stringify(data));
  const [value, setValue] = React.useState(() => stringify(data));
  const [usingDiff, setUsingDiff] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const revision = React.useRef(resource.record?.record.sourceRevision);
  const busy = React.useRef(false);
  const mounted = React.useRef(true);
  const changed = value !== baseline;

  React.useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Refetches must not erase a draft or replace its optimistic concurrency baseline.
  React.useEffect(() => {
    if (!changed && !busy.current) {
      const next = stringify(data);
      setBaseline(next);
      setValue(next);
      revision.current = resource.record?.record.sourceRevision;
    }
  }, [data, resource.record]);

  const handleSubmit = async () => {
    if (busy.current || !changed || !canUpdate) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      const parsed: unknown = parse(value, { intAsBigInt: true });
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Resource YAML must contain an object.');
      }
      const result = await mutate({
        route: resource.route,
        reference: resource.reference,
        operation: 'update',
        input: jsonToValue(parsed),
        expectedRevision: revision.current,
      });
      if (!mounted.current) return;
      const next = stringify(valueToJSON(result.body));
      revision.current = result.sourceRevision;
      setBaseline(next);
      setValue(next);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  const unavailable = resourceTypes.isError ? 'Unable to load resource update capabilities.'
    : resourceTypes.isPending ? 'Loading resource update capabilities…'
      : !canUpdate ? 'This resource does not advertise update support for this scope.' : undefined;

  return (
    <Stack style={outerStackStyle} spacing={2} direction="column">
      <CodeEditor
        diff={usingDiff}
        original={baseline}
        value={value}
        onChange={(next) => { if (!busy.current) setValue(next); }}
        language="yaml"
        filename={`${resource.reference.address.id}/spec.yaml`}
        path={`file:///${encodeURIComponent(resource.reference.address.type)}/draft.yaml`}
      />
      {unavailable && <div role="status">{unavailable}</div>}
      {error && <div role="alert">{error}</div>}
      <Stack direction="row" justify="between">
        <Button size="sm" variant="soft" color="neutral" startDecorator={<LuFileCode />} onClick={() => setUsingDiff((prev) => !prev)}>
          {usingDiff ? 'Show Editor' : 'Show Diff'}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button startDecorator={<LuX />} color="neutral" disabled={!changed || pending} size="sm" variant="soft" onClick={() => { setValue(baseline); setError(undefined); }}>
            Reset
          </Button>
          <Button startDecorator={<LuSave />} color="brand" disabled={!changed || pending || !canUpdate} size="sm" variant="soft" onClick={() => { void handleSubmit(); }}>
            {pending ? 'Submitting…' : 'Submit'}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

BaseEditorPage.displayName = 'BaseEditorPage';
export default BaseEditorPage;
