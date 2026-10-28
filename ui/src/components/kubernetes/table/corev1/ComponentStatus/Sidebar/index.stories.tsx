import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentStatus } from 'kubernetes-types/core/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { ComponentStatusSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/corev1/ComponentStatusSidebar',
  component: ComponentStatusSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof ComponentStatusSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shared decorator factory — all ComponentStatus stories use the same container shell. */
function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:/componentstatuses"
        icon="LuHeart"
        title={title}
        open
        onClose={() => {}}
      >
        <Story />
      </ResourceDrawerContainer>
    ),
  ];
}

// -- Healthy (default mock) -------------------------------------------------

export const Healthy: Story = {
  args: {
    ctx: { data: data as unknown as ComponentStatus, resource: fixtureResource('k8s:/componentstatuses', data as unknown as ComponentStatus, 'ctx-1', 'scheduler') },
  },
  decorators: withDrawer(data.metadata.name),
};

// -- Unhealthy --------------------------------------------------------------

const unhealthyData: ComponentStatus = {
  ...(data as unknown as ComponentStatus),
  conditions: [
    { type: 'Healthy', status: 'False', message: 'connection refused' },
  ],
};

export const Unhealthy: Story = {
  args: {
    ctx: { data: unhealthyData, resource: fixtureResource('k8s:/componentstatuses', unhealthyData, 'ctx-1', 'scheduler') },
  },
  decorators: withDrawer('scheduler'),
};
