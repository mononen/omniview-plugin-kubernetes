import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { CSIStorageCapacitySidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/storagev1/CSIStorageCapacitySidebar',
  component: CSIStorageCapacitySidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof CSIStorageCapacitySidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:storage.k8s.io/csistoragecapacities"
        icon="LuHardDrive"
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
    ctx: { data: data as Record<string, unknown>, resource: fixtureResource('k8s:storage.k8s.io/csistoragecapacities', data as Record<string, unknown>, 'ctx-1', 'csisc-a1b2c3d4') },
  },
  decorators: withDrawer(data.metadata.name),
};
