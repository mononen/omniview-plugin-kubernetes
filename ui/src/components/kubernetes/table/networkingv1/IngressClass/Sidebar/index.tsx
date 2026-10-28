import { Chip, Stack, Text, Separator } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import type { IngressClass } from 'kubernetes-types/networking/v1';
import React from 'react';

import LabeledEntry from '../../../../../shared/LabeledEntry';
import ObjectMetaSection from '../../../../../shared/ObjectMetaSection';

const fullWidthStyle = { width: '100%' } as const;
const stackStyle2 = { gap: 6 } as const;

const sectionBorderStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid', borderColor: 'var(--ov-color-border-default)' };

const headerStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };

const bodyBgStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, background: 'var(--ov-color-bg-surface-raised)' };

const chipStyle = { borderRadius: 4 } as const;

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
    <Stack direction="column" spacing={4} style={fullWidthStyle}>
      <Stack direction="column" spacing={1}>
        <ObjectMetaSection data={data.metadata} connectionID={ctx.resource?.route.connection} />

        {/* Controller */}
        <div style={sectionBorderStyle}>
          <div style={headerStyle}>
            <Stack direction="row" spacing={0} align="center" style={stackStyle2}>
              <Text weight="semibold" size="sm">
                Controller
              </Text>
              {isDefault && (
                <Chip size="xs" color="brand" style={chipStyle}>Default</Chip>
              )}
            </Stack>
          </div>
          <Separator />
          <div style={bodyBgStyle}>
            <LabeledEntry label="Controller" value={spec?.controller} />
          </div>
        </div>

        {/* Parameters */}
        {params && (
          <div style={sectionBorderStyle}>
            <div style={headerStyle}>
              <Text weight="semibold" size="sm">
                Parameters
              </Text>
            </div>
            <Separator />
            <div style={bodyBgStyle}>
              {params.apiGroup && <LabeledEntry label="API Group" value={params.apiGroup} />}
              <LabeledEntry label="Kind" value={params.kind} />
              <LabeledEntry label="Name" value={params.name} />
              {params.namespace && <LabeledEntry label="Namespace" value={params.namespace} />}
              {params.scope && <LabeledEntry label="Scope" value={params.scope} />}
            </div>
          </div>
        )}
      </Stack>
    </Stack>
  );
};

IngressClassSidebar.displayName = 'IngressClassSidebar';
export default IngressClassSidebar;
