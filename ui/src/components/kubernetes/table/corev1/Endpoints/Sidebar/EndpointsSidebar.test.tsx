/// <reference types="@testing-library/jest-dom/vitest" />
import { fixtureResource } from '@/stories/resourceFixture';
import type { DrawerContext } from '@omniviewdev/runtime';
import { render, screen } from '@testing-library/react';
import type { Endpoints, EndpointSubset } from 'kubernetes-types/core/v1';
import type React from 'react';
import { vi, describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@omniviewdev/base-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniviewdev/base-ui')>();
  return {
    ...actual,
    Chip: ({ children, color, variant }: {
      children?: React.ReactNode;
      color?: string;
      variant?: string;
    }) => (
      <span data-testid="chip" data-color={color} data-variant={variant}>{children}</span>
    ),
    ClipboardText: ({ value }: { value?: string }) => (
      <span data-testid="clipboard-text">{value}</span>
    ),
  };
});

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

vi.mock('../../../../../shared/ResourceLinkChip', () => ({
  default: ({ resourceName, resourceKey }: {
    resourceName?: string;
    resourceKey?: string;
  }) => (
    <span data-testid="resource-link-chip" data-resource-key={resourceKey}>{resourceName}</span>
  ),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import EndpointSubsetsSection from './EndpointSubsetsSection';

import EndpointsSidebar from './index';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEndpoints(overrides: Partial<Endpoints> = {}): Endpoints {
  return {
    apiVersion: 'v1',
    kind: 'Endpoints',
    metadata: { name: 'my-svc', namespace: 'default', uid: 'ep-123' },
    subsets: [
      {
        addresses: [
          { ip: '10.244.0.5', targetRef: { kind: 'Pod', name: 'my-pod-1', namespace: 'default' } },
        ],
        ports: [{ port: 80, protocol: 'TCP' }],
      },
    ],
    ...overrides,
  };
}

function makeDrawerCtx(data: Endpoints | undefined): DrawerContext<Endpoints> {
  return {
    data,
    resource: fixtureResource('k8s:/endpoints', data, 'conn-1', data?.metadata?.name ?? 'fixture-object'),
  } as DrawerContext<Endpoints>;
}

// ---------------------------------------------------------------------------
// EndpointSubsetsSection
// ---------------------------------------------------------------------------

describe('EndpointSubsetsSection', () => {
  it('returns null when subsets is undefined', () => {
    const { container } = render(<EndpointSubsetsSection subsets={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when subsets is empty', () => {
    const { container } = render(<EndpointSubsetsSection subsets={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows subset count', () => {
    const subsets: EndpointSubset[] = [
      { addresses: [{ ip: '10.0.0.1' }], ports: [{ port: 80, protocol: 'TCP' }] },
      { addresses: [{ ip: '10.0.0.2' }], ports: [{ port: 80, protocol: 'TCP' }] },
    ];
    render(<EndpointSubsetsSection subsets={subsets} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows ready and not-ready count chips per subset', () => {
    const subsets: EndpointSubset[] = [
      {
        addresses: [{ ip: '10.0.0.1' }, { ip: '10.0.0.2' }],
        notReadyAddresses: [{ ip: '10.0.0.3' }],
        ports: [{ port: 80, protocol: 'TCP' }],
      },
    ];
    render(<EndpointSubsetsSection subsets={subsets} />);
    expect(screen.getByText('2 ready')).toBeInTheDocument();
    expect(screen.getByText('1 not ready')).toBeInTheDocument();
  });

  it('renders ready addresses with IP', () => {
    const subsets: EndpointSubset[] = [
      { addresses: [{ ip: '10.244.0.5' }] },
    ];
    render(<EndpointSubsetsSection subsets={subsets} />);
    expect(screen.getByText('10.244.0.5')).toBeInTheDocument();
  });

  it('renders not-ready addresses', () => {
    const subsets: EndpointSubset[] = [
      { notReadyAddresses: [{ ip: '10.244.0.9' }] },
    ];
    render(<EndpointSubsetsSection subsets={subsets} />);
    expect(screen.getByText('Not Ready Addresses')).toBeInTheDocument();
    expect(screen.getByText('10.244.0.9')).toBeInTheDocument();
  });

  it('renders ResourceLinkChip for targetRef when connectionID provided', () => {
    const subsets: EndpointSubset[] = [
      {
        addresses: [{
          ip: '10.244.0.5',
          targetRef: { apiVersion: 'v1', kind: 'Pod', name: 'my-pod', namespace: 'default', uid: 'observed-pod-uid' },
        }],
      },
    ];
    render(<EndpointSubsetsSection subsets={subsets} connectionID="conn-1" />);
    const chip = screen.getByTestId('resource-link-chip');
    expect(chip).toHaveTextContent('my-pod');
  });

  it('renders ResourceLinkChip for nodeName when connectionID provided', () => {
    const subsets: EndpointSubset[] = [
      { addresses: [{ ip: '10.244.0.5', nodeName: 'node-1' }] },
    ];
    render(<EndpointSubsetsSection subsets={subsets} connectionID="conn-1" />);
    expect(screen.getByText('node-1')).toBeInTheDocument();
  });

  it('renders ports', () => {
    const subsets: EndpointSubset[] = [
      {
        addresses: [{ ip: '10.0.0.1' }],
        ports: [{ port: 80, protocol: 'TCP', name: 'http' }],
      },
    ];
    render(<EndpointSubsetsSection subsets={subsets} />);
    expect(screen.getByText('TCP/80 (http)')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// EndpointsSidebar (composed)
// ---------------------------------------------------------------------------

describe('EndpointsSidebar', () => {
  it('returns null when ctx.data is undefined', () => {
    const { container } = render(<EndpointsSidebar ctx={makeDrawerCtx(undefined)} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders ObjectMetaSection', () => {
    render(<EndpointsSidebar ctx={makeDrawerCtx(makeEndpoints())} />);
    const meta = screen.getByTestId('object-meta-section');
    expect(meta).toHaveAttribute('data-name', 'my-svc');
  });

  it('renders subsets section', () => {
    render(<EndpointsSidebar ctx={makeDrawerCtx(makeEndpoints())} />);
    expect(screen.getByText('Subsets')).toBeInTheDocument();
  });
});
