import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EndpointSlice } from 'kubernetes-types/discovery/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { EndpointSliceSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/EndpointSliceSidebar',
  component: EndpointSliceSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof EndpointSliceSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    ctx: { data: data as unknown as EndpointSlice, resource: fixtureResource('k8s:discovery.k8s.io/endpointslices', data as unknown as EndpointSlice, 'ctx-1', 'backend-api-xk9mz') },
  },
};

Primary.decorators = [
  (Story, c) => (
    <ResourceDrawerContainer
      type="k8s:discovery.k8s.io/endpointslices"
      icon="LuTableProperties"
      title={c.args.ctx.data?.metadata?.name ?? ''}
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];
