import { EmptyState, Spinner, Stack, Text } from '@omniviewdev/base-ui';
import type { DrawerContext, RelatedResource } from '@omniviewdev/runtime';
import { relationshipLabel, useRelatedResources } from '@omniviewdev/runtime';
import React from 'react';
import { LuWaypoints } from 'react-icons/lu';

import ResourceLinkChip from '../../shared/ResourceLinkChip';
import SidebarSection from '../../shared/SidebarSection';
import { graphKind, useGraphDisplayNames } from './resourceGraphLayout';


/** Group order: what controls this resource first, then what it points at. */
const groupOrder = [
  'incoming:owns',
  'incoming:manages',
  'outgoing:owns',
  'outgoing:manages',
  'outgoing:runs_on',
  'incoming:runs_on',
  'incoming:selects',
  'outgoing:selects',
  'outgoing:uses',
  'incoming:uses',
  'outgoing:exposes',
  'incoming:exposes',
  'outgoing:member_of',
  'incoming:member_of',
];

type RelatedGroup = {
  key: string;
  title: string;
  items: RelatedResource[];
};


/** Groups related resources by relationship type and direction, sorted for display. */
// eslint-disable-next-line react-refresh/only-export-components
export function groupRelated(related: RelatedResource[], displayNames: ReadonlyMap<string, string> = new Map()): RelatedGroup[] {
  const groups = new Map<string, RelatedGroup>();
  const seen = new Set<string>();

  for (const item of related) {
    const key = `${item.direction}:${item.type}`;
    const r = item.resource;
    const id = `${key}/${r.key}`;
    if (seen.has(id)) continue;
    seen.add(id);

    let group = groups.get(key);
    if (!group) {
      group = { key, title: relationshipLabel(item.type, item.direction), items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }

  const rank = (key: string) => {
    const i = groupOrder.indexOf(key);
    return i === -1 ? groupOrder.length : i;
  };

  return [...groups.values()]
    .sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key))
    .map((group) => ({
      ...group,
      items: group.items.sort(
        (a, b) =>
          graphKind(a.resource, displayNames).localeCompare(graphKind(b.resource, displayNames)) ||
          (a.resource.reference.address.scope.find((entry) => entry.dimension === 'namespace')?.value ?? '')
            .localeCompare(b.resource.reference.address.scope.find((entry) => entry.dimension === 'namespace')?.value ?? '') ||
          a.resource.reference.address.id.localeCompare(b.resource.reference.address.id),
      ),
    }));
}

const containerStyle: React.CSSProperties = { padding: 12, width: '100%' };
const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
};
const kindStyle: React.CSSProperties = { width: 140, flexShrink: 0 };
const centeredStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '32px 0',
};

const RelatedRow: React.FC<{ item: RelatedResource; namespace: string; displayNames: ReadonlyMap<string, string> }> = ({
  item,
  namespace,
  displayNames,
}) => {
  const r = item.resource;
  const kind = graphKind(r, displayNames);
  const targetNamespace = r.reference.address.scope.find((entry) => entry.dimension === 'namespace')?.value;
  const otherNamespace = targetNamespace && targetNamespace !== namespace ? targetNamespace : undefined;

  return (
    <div style={rowStyle}>
      <Text size="xs" tone="muted" style={kindStyle} truncate>
        {kind}
      </Text>
      <ResourceLinkChip
        target={r}
        resourceName={otherNamespace ? `${otherNamespace}/${r.reference.address.id}` : r.reference.address.id}
      />
    </div>
  );
};

const RelatedResourcesList: React.FC<{ ctx: DrawerContext }> = ({ ctx }) => {
  const data = (ctx.data ?? {}) as { metadata?: { name?: string; namespace?: string } };
  const namespace = data.metadata?.namespace ?? '';
  const catalog = useGraphDisplayNames(ctx);
  const { related, isLoading, error } = useRelatedResources({
    pluginID: ctx.resource!.pluginID,
    reference: ctx.resource!.reference,
    route: ctx.resource!.route,
  });

  if (isLoading) {
    return (
      <div style={centeredStyle}>
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        size="sm"
        icon={<LuWaypoints />}
        title="Could not load related resources"
        description={error instanceof Error ? error.message : String(error)}
      />
    );
  }

  const displayNames = catalog.data ?? new Map<string, string>();
  const groups = groupRelated(related, displayNames);

  if (groups.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<LuWaypoints />}
        title="No related resources"
        description="Relationships come from owner references, node assignment, volumes, references and selectors of resources Omniview is watching."
      />
    );
  }

  return (
    <Stack direction="column" spacing={2} style={containerStyle}>
      {groups.map((group) => (
        <SidebarSection key={group.key} title={`${group.title} (${group.items.length})`}>
          <Stack direction="column" spacing={1}>
            {group.items.map((item) => (
              <RelatedRow
                key={`${item.direction}/${item.type}/${item.resource.key}`}
                item={item}
                namespace={namespace}
                displayNames={displayNames}
              />
            ))}
          </Stack>
        </SidebarSection>
      ))}
    </Stack>
  );
};

/**
 * Sidebar view listing the resources linked to this one in the host's
 * relationship graph, grouped by relationship ("Owned by", "Runs on",
 * "Selected by", ...). Each entry opens that resource's sidebar.
 */
const RelatedResourcesView: React.FC<{ ctx: DrawerContext }> = ({ ctx }) => {
  if (!ctx.resource) {
    return <EmptyState size="sm" icon={<LuWaypoints />} title="Resource target is unavailable" />;
  }

  return <RelatedResourcesList ctx={ctx} />;
};

export default RelatedResourcesView;
