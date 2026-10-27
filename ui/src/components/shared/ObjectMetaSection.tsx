import { Card, Chip, Separator, Stack, Text } from '@omniviewdev/base-ui';
import { formatRelative } from 'date-fns';
import { ObjectMeta } from 'kubernetes-types/meta/v1';
import React from 'react';

import ExpandableSections from './ExpandableSections';
import ResourceLinkChip, { ownerRefToResourceKey } from './ResourceLinkChip';

const entryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 9fr)',
  alignItems: 'center',
};

const kvGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 2,
  alignItems: 'center',
};

const cardStyle: React.CSSProperties = {
  padding: 0,
  gap: 0,
  borderRadius: 'var(--ov-radius-sm)',
  minWidth: 0,
};

const metadataHeaderStyle: React.CSSProperties = { paddingBlock: 8, paddingInline: 10 };

const metadataBodyStyle: React.CSSProperties = {
  paddingBlock: 8,
  paddingInline: 12,
  borderBottomRightRadius: 6,
  borderBottomLeftRadius: 6,
};

const ownerChipsStyle: React.CSSProperties = { flexWrap: 'wrap', minWidth: 0 };

const ownerChipStyle: React.CSSProperties = { borderRadius: 4 };

const annotationKeyTextStyle: React.CSSProperties = { fontSize: 13, fontWeight: 400 };

const annotationValueTextStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600 };

interface Props {
  data?: ObjectMeta;
  /** When provided, owner reference chips become clickable and open the owner's sidebar */
  connectionID?: string;
}

const ObjectMetaEntry: React.FC<{
  title: string;
  value: string | undefined;
}> = ({ title, value }) => (
  <div style={entryGridStyle}>
    <Text tone="muted" size="sm">
      {title}
    </Text>
    <Text weight="semibold" size="sm">
      {value}
    </Text>
  </div>
);

const KVGrid: React.FC<{ kvs?: Record<string, string> }> = ({ kvs }) => (
  <div style={kvGridStyle}>
    {Object.entries(kvs || {}).map(([key, value]) => (
      <React.Fragment key={key}>
        <Text style={annotationKeyTextStyle} size="sm">
          {key}
        </Text>
        <Text style={annotationValueTextStyle} size="sm">
          {value}
        </Text>
      </React.Fragment>
    ))}
  </div>
);

const OwnersEntry: React.FC<{ data: ObjectMeta; connectionID?: string }> = ({
  data,
  connectionID,
}) => {
  const owners = data.ownerReferences ?? [];
  if (owners.length === 0) return null;

  return (
    <div style={entryGridStyle}>
      <Text tone="muted" size="sm">
        {owners.length > 1 ? 'Owners' : 'Owner'}
      </Text>
      <Stack direction="row" spacing={1} style={ownerChipsStyle}>
        {owners.map((ref) =>
          connectionID ? (
            <ResourceLinkChip
              key={ref.uid}
              connectionID={connectionID}
              resourceKey={ownerRefToResourceKey(ref)}
              resourceID={ref.name}
              resourceName={ref.kind}
              namespace={data.namespace}
            />
          ) : (
            <Chip key={ref.uid} size="xs" variant="outline" color="neutral" style={ownerChipStyle}>
              {ref.kind}
            </Chip>
          ),
        )}
      </Stack>
    </div>
  );
};

const ObjectMetaSection: React.FC<Props> = ({ data, connectionID }) => {
  if (!data) {
    return null;
  }

  const kvSections = [
    {
      title: 'Annotations',
      defaultExpanded: false,
      children: <KVGrid kvs={data.annotations} />,
    },
    {
      title: 'Labels',
      defaultExpanded: false,
      children: <KVGrid kvs={data.labels} />,
    },
  ];

  return (
    <Stack direction="column" spacing={2}>
      <Card style={cardStyle}>
        <div style={metadataHeaderStyle}>
          <Text weight="semibold" size="sm">
            Metadata
          </Text>
        </div>
        <Separator />
        <div style={metadataBodyStyle}>
          <ObjectMetaEntry title="Name" value={data.name} />
          {data.namespace && <ObjectMetaEntry title="Namespace" value={data.namespace} />}
          <ObjectMetaEntry
            title="Created"
            value={
              data.creationTimestamp
                ? formatRelative(new Date(data.creationTimestamp), new Date())
                : undefined
            }
          />
          <ObjectMetaEntry title="Version" value={data.resourceVersion} />
          <OwnersEntry data={data} connectionID={connectionID} />
        </div>
      </Card>
      <ExpandableSections sections={kvSections} size="md" />
    </Stack>
  );
};

export default ObjectMetaSection;
