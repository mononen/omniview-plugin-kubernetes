import { Chip, Stack, Text, Separator } from '@omniviewdev/base-ui';
import type { EndpointSlice, EndpointPort } from 'kubernetes-types/discovery/v1';
import React from 'react';

const stackStyle1 = { gap: 6 } as const;

const sectionBorderStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid', borderColor: 'var(--ov-color-border-default)' };

const headerStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };

const bodyBgStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, background: 'var(--ov-color-bg-surface-raised)' };

const chipStyle = { borderRadius: 4 } as const;
const monoChipStyle: React.CSSProperties = { ...chipStyle, fontSize: 10, fontFamily: 'var(--ov-font-mono, monospace)' };

const subLabelStyle: React.CSSProperties = { color: 'var(--ov-color-fg-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 };

const addressTypeColor = (
  type: string,
): 'brand' | 'info' | 'warning' | 'neutral' => {
  switch (type) {
    case 'IPv4':
      return 'brand';
    case 'IPv6':
      return 'info';
    case 'FQDN':
      return 'warning';
    default:
      return 'neutral';
  }
};

const PortChip: React.FC<{ port: EndpointPort }> = ({ port }) => (
  <Chip size="xs" color="neutral" style={monoChipStyle} variant="outline">{`${port.protocol || 'TCP'}/${port.port ?? '*'}${port.name ? ` (${port.name})` : ''}`}</Chip>
);

interface Props {
  slice: EndpointSlice;
}

const EndpointSliceInfoSection: React.FC<Props> = ({ slice }) => {
  const ports = slice.ports;

  return (
    <div style={sectionBorderStyle}>
      <div style={headerStyle}>
        <Stack direction="row" spacing={0} align="center" style={stackStyle1}>
          <Text weight="semibold" size="sm">
            Slice Info
          </Text>
          <Chip size="xs" color={addressTypeColor(slice.addressType)} style={chipStyle}>{slice.addressType}</Chip>
        </Stack>
      </div>
      {ports && ports.length > 0 && (
        <>
          <Separator />
          <div style={bodyBgStyle}>
            <div>
              <Text size="xs" weight="semibold" style={subLabelStyle}>
                Ports
              </Text>
              <Stack direction="row" spacing={1} wrap>
                {ports.map((port, i) => (
                  <PortChip key={`${port.protocol}-${port.port}-${i}`} port={port} />
                ))}
              </Stack>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EndpointSliceInfoSection;
