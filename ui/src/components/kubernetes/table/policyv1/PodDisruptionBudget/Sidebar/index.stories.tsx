import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PodDisruptionBudget } from 'kubernetes-types/policy/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { PodDisruptionBudgetSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/policyv1/PodDisruptionBudgetSidebar',
  component: PodDisruptionBudgetSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof PodDisruptionBudgetSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:policy/poddisruptionbudgets"
        icon="LuShield"
        title={title}
        open
        onClose={() => {}}
      >
        <Story />
      </ResourceDrawerContainer>
    ),
  ];
}

// -- MinAvailable (default mock) ------------------------------------------

export const MinAvailable: Story = {
  args: {
    ctx: { data: data as unknown as PodDisruptionBudget, resource: fixtureResource('k8s:policy/poddisruptionbudgets', data as unknown as PodDisruptionBudget, 'ctx-1', 'web-frontend-pdb') },
  },
  decorators: withDrawer(data.metadata.name),
};

// -- MaxUnavailable -------------------------------------------------------

const maxUnavailableData: PodDisruptionBudget = {
  ...(data as unknown as PodDisruptionBudget),
  metadata: { ...data.metadata, name: 'api-pdb' },
  spec: {
    maxUnavailable: '25%',
    selector: {
      matchLabels: {
        app: 'api-server',
      },
    },
    unhealthyPodEvictionPolicy: 'AlwaysAllow',
  },
  status: {
    currentHealthy: 4,
    desiredHealthy: 3,
    disruptionsAllowed: 1,
    expectedPods: 4,
    observedGeneration: 2,
    conditions: [
      {
        type: 'DisruptionAllowed',
        status: 'True',
        lastTransitionTime: '2025-08-01T10:00:00Z',
        reason: 'SufficientPods',
        message: 'The disruption budget has sufficient pods',
      },
    ],
  },
};

export const MaxUnavailable: Story = {
  args: {
    ctx: { data: maxUnavailableData, resource: fixtureResource('k8s:policy/poddisruptionbudgets', maxUnavailableData, 'ctx-1', 'api-pdb') },
  },
  decorators: withDrawer('api-pdb'),
};
