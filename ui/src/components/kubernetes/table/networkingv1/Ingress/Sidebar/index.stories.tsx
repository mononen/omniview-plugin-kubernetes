import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { IngressSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/networkingv1/IngressSidebar',
  component: IngressSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof IngressSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:networking.k8s.io/ingresses"
        icon="LuGlobe"
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
    ctx: { data: data as Record<string, unknown>, resource: fixtureResource('k8s:networking.k8s.io/ingresses', data, 'ctx-1', 'web-ingress') },
  },
  decorators: withDrawer(data.metadata.name),
};
