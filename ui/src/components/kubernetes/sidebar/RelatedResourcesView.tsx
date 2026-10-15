import { EmptyState, Spinner, Stack, Text } from '@omniviewdev/base-ui';
import type { DrawerContext, RelatedResource } from '@omniviewdev/runtime';
import { relationshipLabel, useRelatedResources } from '@omniviewdev/runtime';
import React from 'react';
import { LuWaypoints } from 'react-icons/lu';

import ResourceLinkChip from '../../shared/ResourceLinkChip';
import SidebarSection from '../../shared/SidebarSection';

/**
 * Hosts older than the relationship graph hooks resolve these imports to
 * undefined (shared modules are provided by the host at load time).
 */
const graphSupported = typeof useRelatedResources === 'function';

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

function kindFromKey(resourceKey: string): string {
  const parts = resourceKey.split('::');
  return parts[parts.length - 1];
}

/** Groups related resources by relationship type and direction, sorted for display. */
// eslint-disable-next-line react-refresh/only-export-components
export function groupRelated(related: RelatedResource[]): RelatedGroup[] {
  const groups = new Map<string, RelatedGroup>();
  const seen = new Set<string>();

  for (const item of related) {
    const key = `${item.direction}:${item.type}`;
    const r = item.resource;
    const id = `${key}/${r.resourceKey}/${r.namespace ?? ''}/${r.id}`;
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
          kindFromKey(a.resource.resourceKey).localeCompare(kindFromKey(b.resource.resourceKey)) ||
          (a.resource.namespace ?? '').localeCompare(b.resource.namespace ?? '') ||
          a.resource.id.localeCompare(b.resource.id),
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

const RelatedRow: React.FC<{ item: RelatedResource; namespace: string }> = ({
  item,
  namespace,
}) => {
  const r = item.resource;
  const kind = kindFromKey(r.resourceKey);
  const otherNamespace = r.namespace && r.namespace !== namespace ? r.namespace : undefined;

  return (
    <div style={rowStyle}>
      <Text size="xs" tone="muted" style={kindStyle} truncate>
        {kind}
      </Text>
      <ResourceLinkChip
        pluginID={r.pluginId}
        connectionID={r.connectionId}
        namespace={r.namespace || undefined}
        resourceID={r.id}
        resourceKey={r.resourceKey}
        resourceName={otherNamespace ? `${otherNamespace}/${r.id}` : r.id}
      />
    </div>
  );
};

const RelatedResourcesList: React.FC<{ ctx: DrawerContext }> = ({ ctx }) => {
  const data = (ctx.data ?? {}) as { metadata?: { name?: string; namespace?: string } };
  const namespace = data.metadata?.namespace ?? '';
  // Graph nodes are keyed by name; ctx.resource.id can be the object's UID.
  const name = data.metadata?.name ?? ctx.resource?.id ?? '';

  const { related, isLoading, error } = useRelatedResources({
    pluginID: ctx.resource?.pluginID,
    connectionID: ctx.resource?.connectionID ?? '',
    resourceKey: ctx.resource?.key ?? '',
    resourceID: name,
    namespace,
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

  const groups = groupRelated(related);

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
                key={`${item.resource.resourceKey}/${item.resource.namespace ?? ''}/${item.resource.id}`}
                item={item}
                namespace={namespace}
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
  if (!graphSupported) {
    return (
      <EmptyState
        size="sm"
        icon={<LuWaypoints />}
        title="Update Omniview to see related resources"
        description="This version of Omniview does not expose the relationship graph to plugins."
      />
    );
  }

  return <RelatedResourcesList ctx={ctx} />;
};

export default RelatedResourcesView;
