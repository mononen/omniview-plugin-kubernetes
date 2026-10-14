import type { Meta, StoryObj } from '@storybook/react-vite';

import EventsTable from './EventsTable';

const now = new Date().toISOString();

const events = Array.from({ length: 30 }, (_, i) => ({
  type: i % 3 === 0 ? 'Warning' : 'Normal',
  reason: i % 3 === 0 ? 'BackOff' : 'Pulled',
  message:
    i % 2 === 0
      ? 'Back-off restarting failed container manager in pod controller-manager-7d9f8c6b5-x2k4p_kube-system(1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d)'
      : 'Successfully pulled image "registry.k8s.io/ingress-nginx/controller:v1.11.2" in 1.2s',
  count: i % 4,
  lastTimestamp: now,
  involvedObject: {
    kind: 'Pod',
    name: `a-very-long-pod-name-that-keeps-going-and-going-${i}-7d9f8c6b5-x2k4p`,
    namespace: 'kube-system',
  },
  metadata: { namespace: 'kube-system', creationTimestamp: now },
}));

const meta: Meta<typeof EventsTable> = {
  title: 'Dashboard/EventsTable',
  component: EventsTable,
  decorators: [
    (Story, ctx) => (
      <div style={{ width: (ctx.parameters.panelWidth as number | undefined) ?? 560, height: 'clamp(300px, 40vh, 600px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--ov-color-border-default)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const LongContent: StoryObj<typeof EventsTable> = {
  args: { events, loading: false, connectionID: 'c1' },
};

export const Narrow: StoryObj<typeof EventsTable> = {
  args: { events, loading: false, connectionID: 'c1' },
  parameters: { panelWidth: 380 },
};

export const Wide: StoryObj<typeof EventsTable> = {
  args: { events, loading: false, connectionID: 'c1' },
  parameters: { panelWidth: 1100 },
};
