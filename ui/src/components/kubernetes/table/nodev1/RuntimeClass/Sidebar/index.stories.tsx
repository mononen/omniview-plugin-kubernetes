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
    ctx: {
      data: data as unknown as RuntimeClass,
      resource: { connectionID: 'ctx-1', id: 'gvisor', key: 'node.k8s.io::v1::RuntimeClass' },
    },
  },
};

Primary.decorators = [
  (Story, c) => (
    <ResourceDrawerContainer
      type="node.k8s.io::v1::RuntimeClass"
      icon="LuContainer"
      title={c.args.ctx.data?.metadata?.name ?? ''}
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];
