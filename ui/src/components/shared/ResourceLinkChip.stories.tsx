import type { Meta, StoryObj } from '@storybook/react-vite';

import ResourceLinkChip from './ResourceLinkChip';

const meta = {
  title: 'Shared/ResourceLinkChip',
  component: ResourceLinkChip,
  tags: ['autodocs'],
} satisfies Meta<typeof ResourceLinkChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PodLink: Story = {
  args: {
    connectionID: 'ctx-1',
    namespace: 'default',
    resourceID: 'nginx-abc123',
    resourceKey: 'k8s:/pods',
    resourceName: 'nginx-abc123',
  },
};

export const ServiceLink: Story = {
  args: {
    connectionID: 'ctx-1',
    namespace: 'production',
    resourceID: 'frontend',
    resourceKey: 'k8s:/services',
    resourceName: 'frontend',
  },
};

export const SecretLink: Story = {
  args: {
    connectionID: 'ctx-1',
    namespace: 'default',
    resourceID: 'my-tls-secret',
    resourceKey: 'k8s:/secrets',
    resourceName: 'my-tls-secret',
  },
};
