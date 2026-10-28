import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSIDriver } from 'kubernetes-types/storage/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { CSIDriverSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/storagev1/CSIDriverSidebar',
  component: CSIDriverSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof CSIDriverSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:storage.k8s.io/csidrivers"
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
    ctx: { data: data as unknown as CSIDriver, resource: fixtureResource('k8s:storage.k8s.io/csidrivers', data as unknown as CSIDriver, 'ctx-1', 'ebs.csi.aws.com') },
  },
  decorators: withDrawer(data.metadata.name),
};
