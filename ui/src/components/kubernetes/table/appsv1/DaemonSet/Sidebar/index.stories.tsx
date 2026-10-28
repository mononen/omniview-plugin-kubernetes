import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DaemonSet } from 'kubernetes-types/apps/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { DaemonSetSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/appsv1/DaemonSetSidebar',
  component: DaemonSetSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof DaemonSetSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shared decorator factory — all DaemonSet stories use the same container shell. */
function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:apps/daemonsets"
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

// -- Primary (default mock) -------------------------------------------------

export const Primary: Story = {
  args: {
    ctx: { data: data as unknown as DaemonSet, resource: fixtureResource('k8s:apps/daemonsets', data as unknown as DaemonSet, 'ctx-1', 'node-exporter') },
  },
  decorators: withDrawer(data.metadata.name),
};

// -- WithConditions ---------------------------------------------------------

const withConditionsData: DaemonSet = {
  ...(data as unknown as DaemonSet),
  metadata: { ...data.metadata, name: 'fluentd' },
  status: {
    ...(data as unknown as DaemonSet).status!,
    desiredNumberScheduled: 5,
    currentNumberScheduled: 5,
    numberReady: 4,
    numberAvailable: 4,
    numberUnavailable: 1,
    conditions: [
      {
        type: 'Available',
        status: 'False',
        lastTransitionTime: '2025-04-10T15:00:00Z',
        reason: 'NodeNotReady',
        message: 'One node is not ready, pod is pending',
      },
    ],
  },
};

export const WithConditions: Story = {
  args: {
    ctx: { data: withConditionsData, resource: fixtureResource('k8s:apps/daemonsets', withConditionsData, 'ctx-1', 'fluentd') },
  },
  decorators: withDrawer('fluentd'),
};
