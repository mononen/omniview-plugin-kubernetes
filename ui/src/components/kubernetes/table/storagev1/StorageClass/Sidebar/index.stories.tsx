import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { StorageClass } from 'kubernetes-types/storage/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { StorageClassSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/storagev1/StorageClassSidebar',
  component: StorageClassSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof StorageClassSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:storage.k8s.io/storageclasses"
        icon="LuDatabase"
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
    ctx: { data: data as unknown as StorageClass, resource: fixtureResource('k8s:storage.k8s.io/storageclasses', data, 'ctx-1', 'gp3-encrypted') },
  },
  decorators: withDrawer(data.metadata.name),
};
