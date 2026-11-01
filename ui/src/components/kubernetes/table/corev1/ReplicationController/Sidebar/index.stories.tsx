import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReplicationController } from 'kubernetes-types/core/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { ReplicationControllerSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/corev1/ReplicationControllerSidebar',
  component: ReplicationControllerSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof ReplicationControllerSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:/replicationcontrollers"
        icon="LuCopy"
        title={title}
        open
        onClose={() => {}}
      >
        <Story />
      </ResourceDrawerContainer>
    ),
  ];
}

// -- Primary ----------------------------------------------------------------

export const Primary: Story = {
  args: {
    ctx: { data: data as unknown as ReplicationController, resource: fixtureResource('k8s:/replicationcontrollers', data, 'ctx-1', 'web-rc') },
  },
  decorators: withDrawer(data.metadata.name),
};
