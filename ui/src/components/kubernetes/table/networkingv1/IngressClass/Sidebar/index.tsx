import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { DrawerContext } from '@omniviewdev/runtime';
import { Chip } from '@omniviewdev/ui';
import { Stack } from '@omniviewdev/ui/layout';
import { Text } from '@omniviewdev/ui/typography';
import type { IngressClass } from 'kubernetes-types/networking/v1';
import React from 'react';

import LabeledEntry from '../../../../../shared/LabeledEntry';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

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

interface Props {
  ctx: DrawerContext<IngressClass>;
}

export const IngressClassSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) {
    return null;
  }

  const data = ctx.data;
  const spec = data.spec;
  const isDefault =
    data.metadata?.annotations?.['ingressclass.kubernetes.io/is-default-class'] === 'true';
  const params = spec?.parameters;

  return (
    <Stack direction="column" width={'100%'} spacing={2}>
      <Stack direction="column" spacing={0.5}>
        <ObjectMetaSection data={data.metadata} />

        {/* Controller */}
        <Box sx={sectionBorderSx}>
          <Box sx={headerSx}>
            <Stack direction="row" gap={0.75} alignItems="center">
              <Text weight="semibold" size="sm">
                Controller
              </Text>
              {isDefault && (
                <Chip
                  size="xs"
                  color="primary"
                  emphasis="soft"
                  sx={chipSx}
                  label="Default"
                />
              )}
            </Stack>
          </Box>
          <Divider />
          <Box sx={bodyBgSx}>
            <LabeledEntry label="Controller" value={spec?.controller} />
          </Box>
        </Box>

        {/* Parameters */}
        {params && (
          <Box sx={sectionBorderSx}>
            <Box sx={headerSx}>
              <Text weight="semibold" size="sm">
                Parameters
              </Text>
            </Box>
            <Divider />
            <Box sx={bodyBgSx}>
              {params.apiGroup && <LabeledEntry label="API Group" value={params.apiGroup} />}
              <LabeledEntry label="Kind" value={params.kind} />
              <LabeledEntry label="Name" value={params.name} />
              {params.namespace && <LabeledEntry label="Namespace" value={params.namespace} />}
              {params.scope && <LabeledEntry label="Scope" value={params.scope} />}
            </Box>
          </Box>
        )}
      </Stack>
    </Stack>
  );
};

IngressClassSidebar.displayName = 'IngressClassSidebar';
export default IngressClassSidebar;
