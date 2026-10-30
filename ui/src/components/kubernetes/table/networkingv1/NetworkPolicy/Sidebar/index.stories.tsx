import { fixtureResource } from '@/stories/resourceFixture';
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
    ctx: { data: data as unknown as NetworkPolicy, resource: fixtureResource('k8s:networking.k8s.io/networkpolicies', data, 'ctx-1', 'web-allow-ingress') },
  },
};

Primary.decorators = [
  (Story, c) => (
    <ResourceDrawerContainer
      type="k8s:networking.k8s.io/networkpolicies"
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
    ctx: { data: denyAllData, resource: fixtureResource('k8s:networking.k8s.io/networkpolicies', denyAllData, 'ctx-1', 'deny-all') },
  },
};

DenyAll.decorators = [
  (Story) => (
    <ResourceDrawerContainer
      type="k8s:networking.k8s.io/networkpolicies"
      icon="LuShield"
      title="deny-all"
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];
