import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { IngressClass } from 'kubernetes-types/networking/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { IngressClassSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/IngressClassSidebar',
  component: IngressClassSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof IngressClassSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    ctx: { data: data as unknown as IngressClass, resource: fixtureResource('k8s:networking.k8s.io/ingressclasses', data as unknown as IngressClass, 'ctx-1', 'nginx') },
  },
};

Primary.decorators = [
  (Story, c) => (
    <ResourceDrawerContainer
      type="k8s:networking.k8s.io/ingressclasses"
      icon="LuGlobe"
      title={c.args.ctx.data?.metadata?.name ?? ''}
      open
      onClose={() => {}}
    >
      <Story />
    </ResourceDrawerContainer>
  ),
];
