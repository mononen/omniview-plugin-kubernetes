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
    ctx: {
      data: data as unknown as EndpointSlice,
      resource: { connectionID: 'ctx-1', id: 'backend-api-xk9mz', key: 'discovery.k8s.io::v1::EndpointSlice' },
    },
  },
};

Primary.decorators = [
  (Story, c) => (
    <ResourceDrawerContainer
      type="discovery.k8s.io::v1::EndpointSlice"
      icon="LuTableProperties"
      title={c.args.ctx.data?.metadata?.name ?? ''}
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];
