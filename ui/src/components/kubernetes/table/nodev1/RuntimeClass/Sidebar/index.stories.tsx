import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { RuntimeClass } from 'kubernetes-types/node/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { RuntimeClassSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/RuntimeClassSidebar',
  component: RuntimeClassSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof RuntimeClassSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    ctx: { data: data as unknown as RuntimeClass, resource: fixtureResource('k8s:node.k8s.io/runtimeclasses', data, 'ctx-1', 'gvisor') },
  },
};

Primary.decorators = [
  (Story, c) => (
    <ResourceDrawerContainer
      type="k8s:node.k8s.io/runtimeclasses"
      icon="LuContainer"
      title={c.args.ctx.data?.metadata?.name ?? ''}
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];
