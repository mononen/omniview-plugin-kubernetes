import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { LeaseSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/coordinationv1/LeaseSidebar',
  component: LeaseSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof LeaseSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:coordination.k8s.io/leases"
        icon="LuTimer"
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
    ctx: { data: data as Record<string, unknown>, resource: fixtureResource('k8s:coordination.k8s.io/leases', data as Record<string, unknown>, 'ctx-1', 'kube-scheduler') },
  },
  decorators: withDrawer(data.metadata.name),
};
