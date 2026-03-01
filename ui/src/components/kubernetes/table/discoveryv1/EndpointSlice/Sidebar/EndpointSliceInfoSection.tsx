import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { Chip } from '@omniviewdev/ui';
import { Stack } from '@omniviewdev/ui/layout';
import { Text } from '@omniviewdev/ui/typography';
import type { EndpointSlice, EndpointPort } from 'kubernetes-types/discovery/v1';
import React from 'react';

const sectionBorderSx = {
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
} as const;

const headerSx = {
  py: 0.5,
  px: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
} as const;

const bodyBgSx = {
  py: 0.5,
  px: 1,
  bgcolor: 'background.level1',
} as const;

const chipSx = { borderRadius: 1 } as const;

const subLabelSx = {
  color: 'neutral.400',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  mb: 0.25,
} as const;

const addressTypeColor = (
  type: string,
): 'primary' | 'info' | 'warning' | 'neutral' => {
  switch (type) {
    case 'IPv4':
      return 'primary';
    case 'IPv6':
      return 'info';
    case 'FQDN':
      return 'warning';
    default:
      return 'neutral';
  }
};

const PortChip: React.FC<{ port: EndpointPort }> = ({ port }) => (
  <Chip
    size="xs"
    emphasis="outline"
    color="neutral"
    sx={{ ...chipSx, fontSize: 10, fontFamily: 'var(--ov-font-mono, monospace)' }}
    label={`${port.protocol || 'TCP'}/${port.port ?? '*'}${port.name ? ` (${port.name})` : ''}`}
  />
);

interface Props {
  slice: EndpointSlice;
}

const EndpointSliceInfoSection: React.FC<Props> = ({ slice }) => {
  const ports = slice.ports;

  return (
    <Box sx={sectionBorderSx}>
      <Box sx={headerSx}>
        <Stack direction="row" gap={0.75} alignItems="center">
          <Text weight="semibold" size="sm">
            Slice Info
          </Text>
          <Chip
            size="xs"
            emphasis="soft"
            color={addressTypeColor(slice.addressType)}
            sx={chipSx}
            label={slice.addressType}
          />
        </Stack>
      </Box>
      {ports && ports.length > 0 && (
        <>
          <Divider />
          <Box sx={bodyBgSx}>
            <Box>
              <Text size="xs" weight="semibold" sx={subLabelSx}>
                Ports
              </Text>
              <Stack direction="row" gap={0.5} flexWrap="wrap">
                {ports.map((port, i) => (
                  <PortChip key={`${port.protocol}-${port.port}-${i}`} port={port} />
                ))}
              </Stack>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default EndpointSliceInfoSection;
