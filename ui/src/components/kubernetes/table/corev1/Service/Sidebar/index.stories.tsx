import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Service } from 'kubernetes-types/core/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { ServiceSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/ServiceSidebar',
  component: ServiceSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof ServiceSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// -- LoadBalancer (default mock) ------------------------------------------

export const LoadBalancer: Story = {
  args: {
    ctx: {
      data: data as unknown as Service,
      resource: { connectionID: 'ctx-1', id: 'frontend', key: 'core::v1::Service' },
    },
  },
};

LoadBalancer.decorators = [
  (Story, c) => (
    <ResourceDrawerContainer
      type="core::v1::Service"
      icon="LuNetwork"
      title={c.args.ctx.data?.metadata?.name ?? ''}
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];

// -- ClusterIP ------------------------------------------------------------

const clusterIPData: Service = {
  ...(data as unknown as Service),
  metadata: { ...data.metadata, name: 'backend-api' },
  spec: {
    type: 'ClusterIP',
    clusterIP: '10.96.55.12',
    clusterIPs: ['10.96.55.12'],
    ipFamilies: ['IPv4'],
    ipFamilyPolicy: 'SingleStack',
    sessionAffinity: 'None',
    internalTrafficPolicy: 'Cluster',
    selector: { app: 'backend-api' },
    ports: [
      { name: 'http', protocol: 'TCP', port: 3000, targetPort: 3000 },
      { name: 'grpc', protocol: 'TCP', port: 50051, targetPort: 50051 },
    ],
  },
  status: { loadBalancer: {} },
};

export const ClusterIP: Story = {
  args: {
    ctx: {
      data: clusterIPData,
      resource: { connectionID: 'ctx-1', id: 'backend-api', key: 'core::v1::Service' },
    },
  },
};

ClusterIP.decorators = [
  (Story) => (
    <ResourceDrawerContainer
      type="core::v1::Service"
      icon="LuNetwork"
      title="backend-api"
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];

// -- NodePort -------------------------------------------------------------

const nodePortData: Service = {
  ...(data as unknown as Service),
  metadata: { ...data.metadata, name: 'nginx-nodeport' },
  spec: {
    type: 'NodePort',
    clusterIP: '10.96.200.44',
    clusterIPs: ['10.96.200.44'],
    externalTrafficPolicy: 'Cluster',
    sessionAffinity: 'ClientIP',
    selector: { app: 'nginx' },
    ports: [
      { name: 'http', protocol: 'TCP', port: 80, targetPort: 80, nodePort: 31080 },
    ],
  },
  status: { loadBalancer: {} },
};

export const NodePort: Story = {
  args: {
    ctx: {
      data: nodePortData,
      resource: { connectionID: 'ctx-1', id: 'nginx-nodeport', key: 'core::v1::Service' },
    },
  },
};

NodePort.decorators = [
  (Story) => (
    <ResourceDrawerContainer
      type="core::v1::Service"
      icon="LuNetwork"
      title="nginx-nodeport"
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];

// -- Headless (ClusterIP: None) -------------------------------------------

const headlessData: Service = {
  ...(data as unknown as Service),
  metadata: { ...data.metadata, name: 'postgres-headless' },
  spec: {
    type: 'ClusterIP',
    clusterIP: 'None',
    clusterIPs: ['None'],
    sessionAffinity: 'None',
    selector: { app: 'postgres', 'statefulset.kubernetes.io/pod-name': 'postgres-0' },
    ports: [
      { name: 'tcp-postgresql', protocol: 'TCP', port: 5432, targetPort: 5432 },
    ],
  },
  status: { loadBalancer: {} },
};

export const Headless: Story = {
  args: {
    ctx: {
      data: headlessData,
      resource: { connectionID: 'ctx-1', id: 'postgres-headless', key: 'core::v1::Service' },
    },
  },
};

Headless.decorators = [
  (Story) => (
    <ResourceDrawerContainer
      type="core::v1::Service"
      icon="LuNetwork"
      title="postgres-headless"
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];
