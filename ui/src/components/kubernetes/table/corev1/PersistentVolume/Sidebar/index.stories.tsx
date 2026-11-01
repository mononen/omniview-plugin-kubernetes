import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PersistentVolume } from 'kubernetes-types/core/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { PersistentVolumeSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/corev1/PersistentVolumeSidebar',
  component: PersistentVolumeSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof PersistentVolumeSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:/persistentvolumes"
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

// -- Bound (default) --------------------------------------------------------

export const Bound: Story = {
  args: {
    ctx: { data: data as unknown as PersistentVolume, resource: fixtureResource('k8s:/persistentvolumes', data, 'ctx-1', 'pv-nfs-data') },
  },
  decorators: withDrawer(data.metadata.name),
};

// -- Available --------------------------------------------------------------

const availableData: PersistentVolume = {
  ...(data as unknown as PersistentVolume),
  metadata: { ...data.metadata, name: 'pv-available' },
  spec: {
    ...(data as unknown as PersistentVolume).spec,
    claimRef: undefined,
  },
  status: { phase: 'Available' },
};

export const Available: Story = {
  args: {
    ctx: { data: availableData, resource: fixtureResource('k8s:/persistentvolumes', availableData, 'ctx-1', 'pv-available') },
  },
  decorators: withDrawer('pv-available'),
};

// -- Released ---------------------------------------------------------------

const releasedData: PersistentVolume = {
  ...(data as unknown as PersistentVolume),
  metadata: { ...data.metadata, name: 'pv-released' },
  status: { phase: 'Released' },
};

export const Released: Story = {
  args: {
    ctx: { data: releasedData, resource: fixtureResource('k8s:/persistentvolumes', releasedData, 'ctx-1', 'pv-released') },
  },
  decorators: withDrawer('pv-released'),
};
