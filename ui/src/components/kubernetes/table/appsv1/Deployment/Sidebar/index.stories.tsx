import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Deployment } from 'kubernetes-types/apps/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { DeploymentSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/appsv1/DeploymentSidebar',
  component: DeploymentSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof DeploymentSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shared decorator factory — all Deployment stories use the same container shell. */
function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:apps/deployments"
        icon="LuBox"
        title={title}
        open
        onClose={() => {}}
      >
        <Story />
      </ResourceDrawerContainer>
    ),
  ];
}

// -- RollingUpdate (default mock) -------------------------------------------

export const RollingUpdate: Story = {
  args: {
    ctx: { data: data as unknown as Deployment, resource: fixtureResource('k8s:apps/deployments', data, 'ctx-1', 'frontend') },
  },
  decorators: withDrawer(data.metadata.name),
};

// -- Recreate ---------------------------------------------------------------

const recreateData: Deployment = {
  ...(data as unknown as Deployment),
  metadata: { ...data.metadata, name: 'backend-worker' },
  spec: {
    ...(data as unknown as Deployment).spec!,
    strategy: { type: 'Recreate' },
  },
};

export const Recreate: Story = {
  args: {
    ctx: { data: recreateData, resource: fixtureResource('k8s:apps/deployments', recreateData, 'ctx-1', 'backend-worker') },
  },
  decorators: withDrawer('backend-worker'),
};

// -- Paused -----------------------------------------------------------------

const pausedData: Deployment = {
  ...(data as unknown as Deployment),
  metadata: { ...data.metadata, name: 'frontend-canary' },
  spec: {
    ...(data as unknown as Deployment).spec!,
    paused: true,
  },
};

export const Paused: Story = {
  args: {
    ctx: { data: pausedData, resource: fixtureResource('k8s:apps/deployments', pausedData, 'ctx-1', 'frontend-canary') },
  },
  decorators: withDrawer('frontend-canary'),
};
