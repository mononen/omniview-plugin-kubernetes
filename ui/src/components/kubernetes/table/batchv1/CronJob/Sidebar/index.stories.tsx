import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CronJob } from 'kubernetes-types/batch/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { CronJobSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/batchv1/CronJobSidebar',
  component: CronJobSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof CronJobSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shared decorator factory — all CronJob stories use the same container shell. */
function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:batch/cronjobs"
        icon="LuClock"
        title={title}
        open
        onClose={() => {}}
      >
        <Story />
      </ResourceDrawerContainer>
    ),
  ];
}

// -- Active (default mock) --------------------------------------------------

export const Active: Story = {
  args: {
    ctx: { data: data as unknown as CronJob, resource: fixtureResource('k8s:batch/cronjobs', data, 'ctx-1', 'daily-backup') },
  },
  decorators: withDrawer(data.metadata.name),
};

// -- Suspended --------------------------------------------------------------

const suspendedData = {
  ...(data as unknown as CronJob),
  spec: {
    ...(data as unknown as CronJob).spec,
    suspend: true,
  },
  status: {
    lastScheduleTime: data.status.lastScheduleTime,
    lastSuccessfulTime: data.status.lastSuccessfulTime,
  },
} as unknown as CronJob;

export const Suspended: Story = {
  args: {
    ctx: { data: suspendedData, resource: fixtureResource('k8s:batch/cronjobs', suspendedData, 'ctx-1', 'daily-backup') },
  },
  decorators: withDrawer(data.metadata.name),
};
