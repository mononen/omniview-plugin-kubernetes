import { Chip, ClipboardText, Stack, Text, Separator } from '@omniviewdev/base-ui';
import type { Service } from 'kubernetes-types/core/v1';
import React from 'react';

import ConditionChip from '../../../../../shared/ConditionChip';
import LabeledEntry from '../../../../../shared/LabeledEntry';
import ResourceLinkChip from '../../../../../shared/ResourceLinkChip';

const stackStyle1 = { flexShrink: 0, gap: 6 } as const;

const sectionBorderStyle: React.CSSProperties = { borderRadius: 4, border: '1px solid', borderColor: 'var(--ov-color-border-default)' };

const headerStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };

const bodyBgStyle: React.CSSProperties = { paddingBlock: 4, paddingInline: 8, background: 'var(--ov-color-bg-surface-raised)' };

const entryValueStyle: React.CSSProperties = { fontWeight: 600, fontSize: 12 };
const chipStyle = { borderRadius: 4 } as const;
const cidrValueStyle: React.CSSProperties = { fontWeight: 600, fontSize: 11, fontFamily: 'var(--ov-font-mono, monospace)' };

const typeColor = (
  type?: string,
): 'brand' | 'success' | 'warning' | 'info' | 'neutral' => {
  switch (type) {
    case 'ClusterIP':
      return 'brand';
    case 'NodePort':
      return 'warning';
    case 'LoadBalancer':
      return 'success';
    case 'ExternalName':
      return 'info';
    default:
      return 'neutral';
  }
};

interface Props {
  service: Service;
  connectionID?: string;
}

const ServiceStatusSection: React.FC<Props> = ({ service, connectionID }) => {
  const spec = service.spec;
  const svcType = spec?.type || 'ClusterIP';
  const clusterIP = spec?.clusterIP;
  const clusterIPs = spec?.clusterIPs;
  const externalIPs = spec?.externalIPs;
  const externalName = spec?.externalName;
  const lbIngress = service.status?.loadBalancer?.ingress;
  const conditions = service.status?.conditions;
  const lbSourceRanges = spec?.loadBalancerSourceRanges;
  const healthCheckNodePort = spec?.healthCheckNodePort;
  const svcName = service.metadata?.name;
  const svcNamespace = service.metadata?.namespace;

  return (
    <div style={sectionBorderStyle}>
      {/* Header: title + type chip + conditions */}
      <div style={headerStyle}>
        <Stack direction="row" spacing={0} align="center" style={stackStyle1}>
          <Text weight="semibold" size="sm">
            Service
          </Text>
          <Chip size="xs" color={typeColor(svcType)} style={chipStyle}>{svcType}</Chip>
        </Stack>
        {conditions && conditions.length > 0 && (
          <Stack direction="row" spacing={1} wrap justify="end">
            {conditions.map((condition) => (
              <ConditionChip
                key={condition.type}
                condition={condition}
              />
            ))}
          </Stack>
        )}
      </div>
      <Separator />
      <div style={bodyBgStyle}>
        {clusterIP && clusterIP !== 'None' && (
          <LabeledEntry labelSize={3} label="Cluster IP" value={clusterIP} />
        )}
        {clusterIP === 'None' && (
          <LabeledEntry labelSize={3}
            label="Cluster IP"
            value={
              <Chip size="xs" color="neutral" variant="outline" style={chipStyle}>None (Headless)</Chip>
            }
          />
        )}
        {clusterIPs && clusterIPs.length > 1 && (
          <LabeledEntry labelSize={3}
            label="Cluster IPs"
            value={
              <Stack direction="row" spacing={1} wrap>
                {clusterIPs.map((ip) => (
                  <ClipboardText key={ip} value={ip} style={entryValueStyle} />
                ))}
              </Stack>
            }
          />
        )}
        {externalIPs && externalIPs.length > 0 && (
          <LabeledEntry labelSize={3}
            label="External IPs"
            value={
              <Stack direction="row" spacing={1} wrap>
                {externalIPs.map((ip) => (
                  <ClipboardText key={ip} value={ip} style={entryValueStyle} />
                ))}
              </Stack>
            }
          />
        )}
        {externalName && <LabeledEntry labelSize={3} label="External Name" value={externalName} />}
        {lbIngress && lbIngress.length > 0 &&
          lbIngress.map((ing, i) => (
            <React.Fragment key={ing.hostname || ing.ip || i}>
              {ing.hostname && (
                <LabeledEntry labelSize={3} label="LB Hostname" value={ing.hostname} />
              )}
              {ing.ip && <LabeledEntry labelSize={3} label="LB IP" value={ing.ip} />}
            </React.Fragment>
          ))}
        {lbSourceRanges && lbSourceRanges.length > 0 && (
          <LabeledEntry labelSize={3}
            label="LB Source Ranges"
            value={
              <Stack direction="row" spacing={1} wrap>
                {lbSourceRanges.map((cidr) => (
                  <ClipboardText key={cidr} value={cidr} style={cidrValueStyle} />
                ))}
              </Stack>
            }
          />
        )}
        {healthCheckNodePort != null && healthCheckNodePort > 0 && (
          <LabeledEntry labelSize={3} label="Health Check Port" value={String(healthCheckNodePort)} />
        )}

        {/* Endpoints link */}
        {connectionID && svcName && (
          <LabeledEntry labelSize={3}
            label="Endpoints"
            value={
              <ResourceLinkChip
                connectionID={connectionID}
                resourceKey="core::v1::Endpoints"
                resourceID={svcName}
                resourceName={svcName}
                namespace={svcNamespace}
              />
            }
          />
        )}
      </div>
    </div>
  );
};

export default ServiceStatusSection;
