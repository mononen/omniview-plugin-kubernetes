import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSINode } from 'kubernetes-types/storage/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { CSINodeSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/storagev1/CSINodeSidebar',
  component: CSINodeSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof CSINodeSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:storage.k8s.io/csinodes"
        icon="LuServer"
        title={title}
        open
        onClose={() => {}}
      >
        <Story />
      </ResourceDrawerContainer>
    ),
  ];
}

export const Default: Story = {
  args: {
    ctx: { data: data as unknown as CSINode, resource: fixtureResource('k8s:storage.k8s.io/csinodes', data, 'ctx-1', 'ip-10-0-1-42.ec2.internal') },
  },
  decorators: withDrawer(data.metadata.name),
};
