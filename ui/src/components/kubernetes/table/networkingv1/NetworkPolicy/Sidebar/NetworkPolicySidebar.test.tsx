/// <reference types="@testing-library/jest-dom/vitest" />
import type { DrawerContext } from '@omniviewdev/runtime';
import { render, screen } from '@testing-library/react';
import type { NetworkPolicy } from 'kubernetes-types/networking/v1';
import type React from 'react';
import { vi, describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@omniviewdev/ui', () => ({
  Chip: ({ label, color, emphasis }: {
    label?: string;
    color?: string;
    emphasis?: string;
  }) => (
    <span data-testid="chip" data-color={color} data-emphasis={emphasis}>{label}</span>
  ),
  ClipboardText: ({ value }: { value?: string }) => (
    <span data-testid="clipboard-text">{value}</span>
  ),
}));

vi.mock('@omniviewdev/ui/layout', () => ({
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@omniviewdev/ui/typography', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('../../../../../shared/ObjectMetaSection', () => ({
  default: ({ data }: { data?: { name?: string } }) => (
    <div data-testid="object-meta-section" data-name={data?.name} />
  ),
}));

vi.mock('../../../../../shared/ExpandableSections', () => ({
  default: ({ sections }: {
    sections: Array<{ title: React.ReactNode; children: React.ReactNode }>;
  }) => (
    <div data-testid="expandable-sections">
      {sections.map((s, i) => (
        <div key={i} data-testid="expandable-section">{s.title}{s.children}</div>
      ))}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import PolicyOverviewSection from './PolicyOverviewSection';
import NetworkPolicyRulesSection from './NetworkPolicyRulesSection';
import NetworkPolicySidebar from './index';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePolicy(overrides: Partial<NetworkPolicy> = {}): NetworkPolicy {
  return {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'NetworkPolicy',
    metadata: { name: 'deny-all', namespace: 'default', uid: 'np-123' },
    spec: {
      podSelector: {},
      policyTypes: ['Ingress', 'Egress'],
    },
    ...overrides,
  };
}

function makeDrawerCtx(data: NetworkPolicy | undefined): DrawerContext<NetworkPolicy> {
  return {
    data,
    resource: { connectionID: 'conn-1', id: 'deny-all' },
  } as DrawerContext<NetworkPolicy>;
}

// ---------------------------------------------------------------------------
// PolicyOverviewSection
// ---------------------------------------------------------------------------

describe('PolicyOverviewSection', () => {
  it('renders policy type chips (Ingress/Egress)', () => {
    render(<PolicyOverviewSection policy={makePolicy()} />);
    expect(screen.getByText('Ingress')).toBeInTheDocument();
    expect(screen.getByText('Egress')).toBeInTheDocument();
  });

  it('shows "All Pods" chip when podSelector is empty', () => {
    render(<PolicyOverviewSection policy={makePolicy()} />);
    expect(screen.getByText('All Pods')).toBeInTheDocument();
  });

  it('shows matchLabels as individual chips', () => {
    const policy = makePolicy({
      spec: {
        podSelector: {
          matchLabels: { app: 'web', tier: 'frontend' },
        },
        policyTypes: ['Ingress'],
      },
    });
    render(<PolicyOverviewSection policy={policy} />);
    expect(screen.getByText('app=web')).toBeInTheDocument();
    expect(screen.getByText('tier=frontend')).toBeInTheDocument();
  });

  it('shows matchExpressions as chips', () => {
    const policy = makePolicy({
      spec: {
        podSelector: {
          matchExpressions: [
            { key: 'env', operator: 'In', values: ['prod', 'staging'] },
          ],
        },
        policyTypes: ['Ingress'],
      },
    });
    render(<PolicyOverviewSection policy={policy} />);
    expect(screen.getByText('env In prod, staging')).toBeInTheDocument();
  });

  it('shows both matchLabels and matchExpressions together', () => {
    const policy = makePolicy({
      spec: {
        podSelector: {
          matchLabels: { app: 'web' },
          matchExpressions: [
            { key: 'env', operator: 'NotIn', values: ['dev'] },
          ],
        },
        policyTypes: ['Ingress'],
      },
    });
    render(<PolicyOverviewSection policy={policy} />);
    expect(screen.getByText('app=web')).toBeInTheDocument();
    expect(screen.getByText('env NotIn dev')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// NetworkPolicyRulesSection
// ---------------------------------------------------------------------------

describe('NetworkPolicyRulesSection', () => {
  it('returns null when rules is empty', () => {
    const { container } = render(
      <NetworkPolicyRulesSection direction="Ingress" rules={[]} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when rules is undefined', () => {
    const { container } = render(
      <NetworkPolicyRulesSection direction="Ingress" rules={undefined} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows rule count chip', () => {
    render(
      <NetworkPolicyRulesSection
        direction="Ingress"
        rules={[
          { from: [{ podSelector: { matchLabels: { app: 'web' } } }] },
          { from: [{ podSelector: { matchLabels: { app: 'api' } } }] },
        ]}
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows direction label', () => {
    render(
      <NetworkPolicyRulesSection
        direction="Egress"
        rules={[{ to: [{ podSelector: {} }] }]}
      />,
    );
    expect(screen.getByText('Egress Rules')).toBeInTheDocument();
  });

  it('shows pod selector peers', () => {
    render(
      <NetworkPolicyRulesSection
        direction="Ingress"
        rules={[{ from: [{ podSelector: { matchLabels: { role: 'db' } } }] }]}
      />,
    );
    expect(screen.getByText('role=db')).toBeInTheDocument();
  });

  it('shows namespace selector peers', () => {
    render(
      <NetworkPolicyRulesSection
        direction="Ingress"
        rules={[{ from: [{ namespaceSelector: { matchLabels: { env: 'prod' } } }] }]}
      />,
    );
    expect(screen.getByText('env=prod')).toBeInTheDocument();
  });

  it('shows IP block with CIDR and exceptions', () => {
    render(
      <NetworkPolicyRulesSection
        direction="Ingress"
        rules={[{
          from: [{
            ipBlock: {
              cidr: '172.17.0.0/16',
              except: ['172.17.1.0/24'],
            },
          }],
        }]}
      />,
    );
    expect(screen.getByText('172.17.0.0/16')).toBeInTheDocument();
    expect(screen.getByText('172.17.1.0/24')).toBeInTheDocument();
  });

  it('shows ports with protocol/port/endPort', () => {
    render(
      <NetworkPolicyRulesSection
        direction="Ingress"
        rules={[{
          from: [{ podSelector: {} }],
          ports: [
            { protocol: 'TCP', port: 80 },
            { protocol: 'TCP', port: 8000, endPort: 8080 },
          ],
        }]}
      />,
    );
    expect(screen.getByText('TCP/80')).toBeInTheDocument();
    expect(screen.getByText('TCP/8000-8080')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// NetworkPolicySidebar (composed)
// ---------------------------------------------------------------------------

describe('NetworkPolicySidebar', () => {
  it('returns null when ctx.data is undefined', () => {
    const { container } = render(<NetworkPolicySidebar ctx={makeDrawerCtx(undefined)} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders deny-all ingress when ingress rules empty and policyTypes includes Ingress', () => {
    const policy = makePolicy({
      spec: { podSelector: {}, policyTypes: ['Ingress'] },
    });
    render(<NetworkPolicySidebar ctx={makeDrawerCtx(policy)} />);
    expect(screen.getByText('Deny All')).toBeInTheDocument();
  });

  it('renders deny-all egress', () => {
    const policy = makePolicy({
      spec: { podSelector: {}, policyTypes: ['Egress'] },
    });
    render(<NetworkPolicySidebar ctx={makeDrawerCtx(policy)} />);
    expect(screen.getByText('Deny All')).toBeInTheDocument();
  });

  it('renders ingress and egress rules sections', () => {
    const policy = makePolicy({
      spec: {
        podSelector: {},
        policyTypes: ['Ingress', 'Egress'],
        ingress: [{ from: [{ podSelector: { matchLabels: { app: 'web' } } }] }],
        egress: [{ to: [{ podSelector: { matchLabels: { app: 'db' } } }] }],
      },
    });
    render(<NetworkPolicySidebar ctx={makeDrawerCtx(policy)} />);
    expect(screen.getByText('Ingress Rules')).toBeInTheDocument();
    expect(screen.getByText('Egress Rules')).toBeInTheDocument();
  });

  it('renders full policy with both directions', () => {
    const policy = makePolicy({
      spec: {
        podSelector: { matchLabels: { app: 'web' } },
        policyTypes: ['Ingress', 'Egress'],
        ingress: [{
          from: [{ podSelector: { matchLabels: { role: 'api' } } }],
          ports: [{ protocol: 'TCP', port: 443 }],
        }],
        egress: [{
          to: [{ ipBlock: { cidr: '10.0.0.0/8' } }],
          ports: [{ protocol: 'TCP', port: 5432 }],
        }],
      },
    });
    render(<NetworkPolicySidebar ctx={makeDrawerCtx(policy)} />);
    expect(screen.getByTestId('object-meta-section')).toBeInTheDocument();
    expect(screen.getByText('Policy Overview')).toBeInTheDocument();
    expect(screen.getByText('app=web')).toBeInTheDocument();
    expect(screen.getByText('Ingress Rules')).toBeInTheDocument();
    expect(screen.getByText('Egress Rules')).toBeInTheDocument();
  });
});
