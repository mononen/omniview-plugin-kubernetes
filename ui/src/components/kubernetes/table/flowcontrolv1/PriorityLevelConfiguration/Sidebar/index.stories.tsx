import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { PriorityLevelConfigurationSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/flowcontrolv1/PriorityLevelConfigurationSidebar',
  component: PriorityLevelConfigurationSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof PriorityLevelConfigurationSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:flowcontrol.apiserver.k8s.io/prioritylevelconfigurations"
        icon="LuLayers"
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
    ctx: { data: data as Record<string, unknown>, resource: fixtureResource('k8s:flowcontrol.apiserver.k8s.io/prioritylevelconfigurations', data, 'ctx-1', 'leader-election') },
  },
  decorators: withDrawer(data.metadata.name),
};
