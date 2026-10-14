import { Chip, Grid, Stack, Text } from '@omniviewdev/base-ui';
import { DrawerContext } from '@omniviewdev/runtime';
import { Ingress } from 'kubernetes-types/networking/v1';
import React from 'react';

import { BrowserOpenURL } from '../../../../utils/ide';
import { containsKeyWithPrefix } from '../../../../utils/objects';
import Card from '../../../shared/Card';
import DetailsCard, { DetailsCardEntry } from '../../../shared/DetailsCard';
import ObjectMetaSection from '../../../shared/ObjectMetaSection';

import RuleTable from './RuleTable';

const ruleChipStyle: React.CSSProperties = {
  paddingInline: 8,
  borderRadius: 'var(--ov-radius-sm)',
  alignSelf: 'flex-start',
};

interface Props {
  ctx: DrawerContext<Ingress>;
}

export const IngressSidebar: React.FC<Props> = ({ ctx }) => {
  if (!ctx.data) {
    return null;
  }

  const obj = ctx.data;

  // compose your component here
  return (
    <Stack direction="column" spacing={2} style={{ width: '100%' }}>
      <ObjectMetaSection data={obj.metadata} />
      <div>
        <Grid columns={12} spacing={1}>
          {!!obj.status?.loadBalancer?.ingress?.length && (
            <Grid.Item span={12}>
              <LoadBalancerInfo obj={obj} />
            </Grid.Item>
          )}
          <Grid.Item span={12}>
            <RuleInfo obj={obj} />
          </Grid.Item>
          {/* AWS Load Balancer Controller */}
          {containsKeyWithPrefix(obj?.metadata?.annotations, 'alb.ingress.kubernetes.io') && (
            <Grid.Item span={12}>
              <AWSLoadBalancerControllerInfo obj={obj} />
            </Grid.Item>
          )}
        </Grid>
      </div>
      {/* <pre>{JSON.stringify(data, null, 2)}</pre>; */}
    </Stack>
  );
};

interface InfoSectionProps {
  obj: Ingress;
}

const annotationValue = (obj: Ingress, key: string) => {
  return obj.metadata?.annotations?.['alb.ingress.kubernetes.io/' + key] ?? '';
};

const LoadBalancerInfo: React.FC<InfoSectionProps> = ({ obj }) => {
  const data = [] as DetailsCardEntry[];

  obj.status?.loadBalancer?.ingress?.forEach((ingress) => {
    if (ingress.hostname || ingress.ip) {
      data.push({
        key: ingress.hostname ? 'Hostname' : 'IP',
        value: `${ingress.hostname ?? ingress.ip} ${ingress.ports?.map((p) => `${p.protocol ?? ''}${p.port ?? ''}`).join(', ') ?? ''}`,
      });
    }
  });

  return <DetailsCard title="Load Balancer" data={data} />;
};

const RuleInfo: React.FC<InfoSectionProps> = ({ obj }) => {
  return (
    <Card title="Rules" icon="LuNetwork">
      {obj.spec?.rules?.map((rule) => (
        <Stack key={rule.host ?? '*'} direction="column" spacing={2} style={{ padding: 8 }}>
          <Chip
            clickable
            size="sm"
            style={ruleChipStyle}
            variant="outline"
            onClick={() =>
              rule.host &&
              BrowserOpenURL(rule.host.startsWith('http') ? rule.host : 'https://' + rule.host)
            }
          >
            {rule.host}
          </Chip>
          {rule.http?.paths ? <RuleTable rule={rule} /> : <Text size="sm">No paths defined</Text>}
        </Stack>
      ))}
    </Card>
  );
};

const AWSLoadBalancerControllerInfo: React.FC<InfoSectionProps> = ({ obj }) => {
  const data = [
    {
      key: 'Name',
      value: annotationValue(obj, 'load-balancer-name'),
      ratio: [4, 8],
    },
    {
      key: 'Group',
      value: annotationValue(obj, 'group.name'),
      ratio: [4, 8],
    },
    {
      key: 'Group Order',
      value: annotationValue(obj, 'group.order'),
      ratio: [4, 8],
    },
    {
      key: 'Scheme',
      value: annotationValue(obj, 'scheme'),
      ratio: [4, 8],
    },
    {
      key: 'Certificate ARN',
      value: annotationValue(obj, 'certificate-arn'),
      ratio: [4, 8],
    },
    {
      key: 'Healthcheck Protocol',
      value: annotationValue(obj, 'healthcheck-protocol'),
      ratio: [4, 8],
    },
    {
      key: 'Healthcheck Path',
      value: annotationValue(obj, 'healthcheck-path'),
      ratio: [4, 8],
    },
    {
      key: 'Healthcheck Port',
      value: annotationValue(obj, 'healthcheck-port'),
      ratio: [4, 8],
    },
  ] as DetailsCardEntry[];
  return (
    <DetailsCard
      title="AWS Load Balancer Controller"
      icon="https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.7/assets/images/aws_load_balancer_icon.svg"
      data={data}
    />
  );
};

export default IngressSidebar;
