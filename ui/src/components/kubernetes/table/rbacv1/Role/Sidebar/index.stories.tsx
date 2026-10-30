import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Role } from 'kubernetes-types/rbac/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { RoleSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/rbacv1/RoleSidebar',
  component: RoleSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof RoleSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:rbac.authorization.k8s.io/roles"
        icon="LuShieldCheck"
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
    ctx: { data: data as unknown as Role, resource: fixtureResource('k8s:rbac.authorization.k8s.io/roles', data, 'ctx-1', 'pod-manager') },
  },
  decorators: withDrawer(data.metadata.name),
};
