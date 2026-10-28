import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { EventSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/corev1/EventSidebar',
  component: EventSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof EventSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:/events"
        icon="LuBell"
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
    ctx: { data: data as Record<string, unknown>, resource: fixtureResource('k8s:/events', data as Record<string, unknown>, 'ctx-1', 'web-frontend-6d8f9b7c4d-x2k9p.17a3b4c5d6e7f8a9') },
  },
  decorators: withDrawer(data.metadata.name),
};
