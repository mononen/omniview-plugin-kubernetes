import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PersistentVolumeClaim } from 'kubernetes-types/core/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { PersistentVolumeClaimSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/corev1/PersistentVolumeClaimSidebar',
  component: PersistentVolumeClaimSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof PersistentVolumeClaimSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:/persistentvolumeclaims"
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
    ctx: { data: data as unknown as PersistentVolumeClaim, resource: fixtureResource('k8s:/persistentvolumeclaims', data as unknown as PersistentVolumeClaim, 'ctx-1', 'data-pvc') },
  },
  decorators: withDrawer(data.metadata.name),
};

// -- Pending ----------------------------------------------------------------

const pendingData: PersistentVolumeClaim = {
  ...(data as unknown as PersistentVolumeClaim),
  metadata: { ...data.metadata, name: 'pending-pvc' },
  spec: {
    ...(data as unknown as PersistentVolumeClaim).spec,
    volumeName: undefined,
  },
  status: {
    phase: 'Pending',
  },
};

export const Pending: Story = {
  args: {
    ctx: { data: pendingData, resource: fixtureResource('k8s:/persistentvolumeclaims', pendingData, 'ctx-1', 'pending-pvc') },
  },
  decorators: withDrawer('pending-pvc'),
};
