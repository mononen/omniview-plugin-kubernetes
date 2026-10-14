import { Chip, Table, Text } from '@omniviewdev/base-ui';
import { IngressBackend, IngressRule } from 'kubernetes-types/networking/v1';
import React from 'react';

import { BrowserOpenURL } from '../../../../utils/ide';

const backendEndDecoratorStyle: React.CSSProperties = {
  borderRadius: 'var(--ov-radius-sm)',
  paddingInline: 8,
};
const backendChipStyle: React.CSSProperties = { borderRadius: 'var(--ov-radius-sm)', padding: 2 };
const portLabelStyle: React.CSSProperties = { paddingInline: 8 };
const headerCellStyle: React.CSSProperties = { height: '30px', paddingBottom: '6px' };

interface Props {
  rule: IngressRule;
}

export const RuleTable: React.FC<Props> = ({ rule }) => {
  const handleLinkClick = (host?: string, path?: string) => {
    if (host) {
      const targetHost = host.startsWith('http') ? host : 'https://' + host;
      const targetPath = path?.startsWith('/') ? path : '/' + path;
      BrowserOpenURL(targetHost + targetPath);
    }
  };

  return (
    <Table aria-label="rules table" size="sm">
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell style={headerCellStyle}>Path</Table.HeaderCell>
          <Table.HeaderCell style={{ ...headerCellStyle, width: '150px' }}>Type</Table.HeaderCell>
          <Table.HeaderCell style={headerCellStyle}>Target</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {rule.http?.paths.map((path) => (
          <Table.Row
            key={`${path.path ?? '/'}-${path.pathType}`}
            style={{
              padding: '0.5rem',
            }}
          >
            <Table.Cell
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
                height: '1.5rem',
              }}
              onClick={() => handleLinkClick(rule.host, path.path)}
            >
              {path.path ?? '/'}
            </Table.Cell>
            <Table.Cell>{path.pathType}</Table.Cell>
            <Table.Cell>
              <IngressBackendChip backend={path.backend} />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};

const IngressBackendChip: React.FC<{ backend: IngressBackend }> = ({ backend }) => {
  if (backend.service !== undefined) {
    return (
      backend.service.port && (
        <Chip
          endDecorator={
            <span style={backendEndDecoratorStyle}>
              <Text size="xs">{backend.service.name}</Text>
            </span>
          }
          style={backendChipStyle}
          size="sm"
          variant="outline"
        >
          <Text size="xs" style={portLabelStyle}>
            {backend.service.port.number ?? backend.service.port.name}
          </Text>
        </Chip>
      )
    );
  }
};

export default RuleTable;
