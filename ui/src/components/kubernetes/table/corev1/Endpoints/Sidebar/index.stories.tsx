import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Endpoints } from 'kubernetes-types/core/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { EndpointsSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/EndpointsSidebar',
  component: EndpointsSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof EndpointsSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    ctx: { data: data as unknown as Endpoints, resource: fixtureResource('k8s:/endpoints', data, 'ctx-1', 'backend-api') },
  },
};

Primary.decorators = [
  (Story, c) => (
    <ResourceDrawerContainer
      type="k8s:/endpoints"
      icon="LuMapPin"
      title={c.args.ctx.data?.metadata?.name ?? ''}
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];
