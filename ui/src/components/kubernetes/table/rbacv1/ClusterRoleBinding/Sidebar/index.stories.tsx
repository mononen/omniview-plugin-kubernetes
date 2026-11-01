import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ClusterRoleBinding } from 'kubernetes-types/rbac/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { ClusterRoleBindingSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/rbacv1/ClusterRoleBindingSidebar',
  component: ClusterRoleBindingSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof ClusterRoleBindingSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:rbac.authorization.k8s.io/clusterrolebindings"
        icon="LuLink"
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
    ctx: { data: data as unknown as ClusterRoleBinding, resource: fixtureResource('k8s:rbac.authorization.k8s.io/clusterrolebindings', data, 'ctx-1', 'monitoring-reader-binding') },
  },
  decorators: withDrawer(data.metadata.name),
};
