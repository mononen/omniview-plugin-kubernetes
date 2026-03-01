import type { Meta, StoryObj } from '@storybook/react-vite';
import type { NetworkPolicy } from 'kubernetes-types/networking/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { NetworkPolicySidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/NetworkPolicySidebar',
  component: NetworkPolicySidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof NetworkPolicySidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// -- Primary (full ingress + egress rules) --------------------------------

export const Primary: Story = {
  args: {
    ctx: {
      data: data as unknown as NetworkPolicy,
      resource: { connectionID: 'ctx-1', id: 'web-allow-ingress', key: 'networking.k8s.io::v1::NetworkPolicy' },
    },
  },
};

Primary.decorators = [
  (Story, c) => (
    <ResourceDrawerContainer
      type="networking.k8s.io::v1::NetworkPolicy"
      icon="LuShield"
      title={c.args.ctx.data?.metadata?.name ?? ''}
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];

// -- Deny All (both directions) -------------------------------------------

const denyAllData: NetworkPolicy = {
  apiVersion: 'networking.k8s.io/v1',
  kind: 'NetworkPolicy',
  metadata: {
    name: 'deny-all',
    namespace: 'production',
    uid: 'np-deny-all-uid',
    creationTimestamp: '2025-08-02T14:12:09Z',
  },
  spec: {
    podSelector: {},
    policyTypes: ['Ingress', 'Egress'],
  },
};

export const DenyAll: Story = {
  args: {
    ctx: {
      data: denyAllData,
      resource: { connectionID: 'ctx-1', id: 'deny-all', key: 'networking.k8s.io::v1::NetworkPolicy' },
    },
  },
};

DenyAll.decorators = [
  (Story) => (
    <ResourceDrawerContainer
      type="networking.k8s.io::v1::NetworkPolicy"
      icon="LuShield"
      title="deny-all"
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];
