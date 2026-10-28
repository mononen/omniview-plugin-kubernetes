import { fixtureResource } from '@/stories/resourceFixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ValidatingAdmissionPolicy } from 'kubernetes-types/admissionregistration/v1';

import ResourceDrawerContainer from '../../../../../../stories/containers/SidebarContainer';

import data from './mock.json';

import { ValidatingAdmissionPolicySidebar } from '.';

const meta = {
  title: 'Kubernetes/Sidebars/admissionregistrationv1/ValidatingAdmissionPolicySidebar',
  component: ValidatingAdmissionPolicySidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof ValidatingAdmissionPolicySidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shared decorator factory — all ValidatingAdmissionPolicy stories use the same container shell. */
function withDrawer(title: string) {
  return [
    (Story: React.FC) => (
      <ResourceDrawerContainer
        type="k8s:admissionregistration.k8s.io/validatingadmissionpolicies"
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

// -- Primary (full mock) ----------------------------------------------------

export const Primary: Story = {
  args: {
    ctx: { data: data as unknown as ValidatingAdmissionPolicy, resource: fixtureResource('k8s:admissionregistration.k8s.io/validatingadmissionpolicies', data as unknown as ValidatingAdmissionPolicy, 'ctx-1', 'deny-privileged-containers') },
  },
  decorators: withDrawer(data.metadata.name),
};

// -- Minimal (single validation, no audit/variables) ------------------------

const minimalData = {
  ...(data as unknown as ValidatingAdmissionPolicy),
  metadata: { ...data.metadata, name: 'minimal-policy' },
  spec: {
    failurePolicy: 'Ignore',
    matchConstraints: {
      resourceRules: [
        { operations: ['CREATE'], apiGroups: [''], apiVersions: ['v1'], resources: ['pods'] },
      ],
    },
    validations: [
      { expression: 'object.metadata.labels.exists(l, l == "team")', message: 'Team label is required' },
    ],
  },
  status: {},
} as unknown as ValidatingAdmissionPolicy;

export const Minimal: Story = {
  args: {
    ctx: { data: minimalData, resource: fixtureResource('k8s:admissionregistration.k8s.io/validatingadmissionpolicies', minimalData, 'ctx-1', 'minimal-policy') },
  },
  decorators: withDrawer('minimal-policy'),
};
