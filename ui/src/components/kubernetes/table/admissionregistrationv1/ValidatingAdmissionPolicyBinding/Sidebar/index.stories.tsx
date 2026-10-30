import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ValidatingAdmissionPolicyBinding } from 'kubernetes-types/admissionregistration/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { ValidatingAdmissionPolicyBindingSidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/admissionregistrationv1/ValidatingAdmissionPolicyBindingSidebar',
  component: ValidatingAdmissionPolicyBindingSidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof ValidatingAdmissionPolicyBindingSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shared decorator factory — all ValidatingAdmissionPolicyBinding stories use the same container shell. */
function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:admissionregistration.k8s.io/validatingadmissionpolicybindings"
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

// -- Primary (full mock) ----------------------------------------------------

export const Primary: Story = {
  args: {
    ctx: { data: data as unknown as ValidatingAdmissionPolicyBinding, resource: fixtureResource('k8s:admissionregistration.k8s.io/validatingadmissionpolicybindings', data, 'ctx-1', 'deny-privileged-binding') },
  },
  decorators: withDrawer(data.metadata.name),
};

// -- Minimal (no matchResources) --------------------------------------------

const minimalData: ValidatingAdmissionPolicyBinding = {
  ...(data as unknown as ValidatingAdmissionPolicyBinding),
  metadata: { ...data.metadata, name: 'minimal-binding' },
  spec: {
    policyName: 'deny-privileged-containers',
    validationActions: ['Deny'],
  },
};

export const Minimal: Story = {
  args: {
    ctx: { data: minimalData, resource: fixtureResource('k8s:admissionregistration.k8s.io/validatingadmissionpolicybindings', minimalData, 'ctx-1', 'minimal-binding') },
  },
  decorators: withDrawer('minimal-binding'),
};
