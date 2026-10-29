/// <reference types="@testing-library/jest-dom/vitest" />
import { fixtureResource } from '@/stories/resourceFixture';
import type { DrawerContext } from '@omniviewdev/runtime';
import { render, screen } from '@testing-library/react';
import type { Service } from 'kubernetes-types/core/v1';
import type React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

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

// Port-forward mock — mutable so individual tests can override sessions
let mockPortForwarder = {
  sessions: { data: [] as any[] },
  forward: vi.fn(),
  close: vi.fn(),
};

vi.mock('@omniviewdev/runtime', () => ({
  useResourcePortForwarder: () => mockPortForwarder,
}));

vi.mock('@omniviewdev/runtime/models', () => ({
  networker: {},
}));

vi.mock('@omniviewdev/runtime/runtime', () => ({
  Browser: { OpenURL: vi.fn() },
}));

vi.mock('../../../../../shared/ObjectMetaSection', () => ({
  default: ({ data }: { data?: { name?: string } }) => (
    <div data-testid="object-meta-section" data-name={data?.name} />
  ),
}));

vi.mock('../../../../../shared/KVCard', () => ({
  default: ({ title, kvs }: {
    title: string;
    kvs: Record<string, string>;
  }) => (
    <div data-testid="kv-card" data-title={title}>
      {Object.entries(kvs).map(([k, v]) => (
        <span key={k}>{k}={v as string}</span>
      ))}
    </div>
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

vi.mock('../../../../../shared/ConditionChip', () => ({
  default: ({ condition }: { condition?: { type?: string } }) => (
    <span data-testid="condition-chip">{condition?.type}</span>
  ),
}));

vi.mock('../../../../../shared/Icon', () => ({
  default: ({ name }: { name?: string }) => <span data-testid="icon">{name}</span>,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import ServicePortsSection from './ServicePortsSection';
import ServiceStatusSection from './ServiceStatusSection';

import ServiceSidebar from './index';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name: 'my-svc', namespace: 'default', uid: 'svc-123' },
    spec: {
      type: 'ClusterIP',
      clusterIP: '10.96.0.1',
      ports: [{ port: 80, targetPort: 8080, protocol: 'TCP', name: 'http' }],
      selector: { app: 'my-app' },
    },
    ...overrides,
  };
}

function makeDrawerCtx(data: Service | undefined): DrawerContext<Service> {
  return {
    data,
    resource: fixtureResource('k8s:/services', data, 'conn-1', data?.metadata?.name ?? 'fixture-object'),
  } as DrawerContext<Service>;
}

// ---------------------------------------------------------------------------
// ServiceStatusSection
// ---------------------------------------------------------------------------

describe('ServiceStatusSection', () => {
  it('renders ClusterIP type chip with primary color', () => {
    render(<ServiceStatusSection service={makeService()} />);
    const chip = screen.getByText('ClusterIP');
    expect(chip).toHaveAttribute('data-color', 'brand');
  });

  it('renders NodePort type chip with warning color', () => {
    const svc = makeService({ spec: { type: 'NodePort', ports: [] } });
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('NodePort')).toHaveAttribute('data-color', 'warning');
  });

  it('renders LoadBalancer type chip with success color', () => {
    const svc = makeService({ spec: { type: 'LoadBalancer', ports: [] } });
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('LoadBalancer')).toHaveAttribute('data-color', 'success');
  });

  it('renders ExternalName type chip with info color', () => {
    const svc = makeService({
      spec: { type: 'ExternalName', externalName: 'ext.example.com', ports: [] },
    });
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('ExternalName')).toHaveAttribute('data-color', 'info');
  });

  it('shows Cluster IP when present', () => {
    render(<ServiceStatusSection service={makeService()} />);
    expect(screen.getByText('Cluster IP')).toBeInTheDocument();
    expect(screen.getByText('10.96.0.1')).toBeInTheDocument();
  });

  it('shows "None (Headless)" chip when clusterIP is "None"', () => {
    const svc = makeService({ spec: { type: 'ClusterIP', clusterIP: 'None', ports: [] } });
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('None (Headless)')).toBeInTheDocument();
  });

  it('shows multiple Cluster IPs when more than one', () => {
    const svc = makeService({
      spec: {
        type: 'ClusterIP',
        clusterIP: '10.96.0.1',
        clusterIPs: ['10.96.0.1', 'fd00::1'],
        ports: [],
      },
    });
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('fd00::1')).toBeInTheDocument();
  });

  it('shows External IPs', () => {
    const svc = makeService({
      spec: {
        type: 'ClusterIP',
        clusterIP: '10.96.0.1',
        externalIPs: ['203.0.113.1'],
        ports: [],
      },
    });
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('203.0.113.1')).toBeInTheDocument();
  });

  it('shows External Name for ExternalName type', () => {
    const svc = makeService({
      spec: { type: 'ExternalName', externalName: 'my.external.svc', ports: [] },
    });
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('my.external.svc')).toBeInTheDocument();
  });

  it('shows LB hostname and IP when type=LoadBalancer', () => {
    const svc = {
      ...makeService({ spec: { type: 'LoadBalancer', clusterIP: '10.96.0.1', ports: [] } }),
      status: {
        loadBalancer: {
          ingress: [{ hostname: 'lb.example.com', ip: '34.120.0.1' }],
        },
      },
    } as Service;
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('lb.example.com')).toBeInTheDocument();
    expect(screen.getByText('34.120.0.1')).toBeInTheDocument();
  });

  it('shows LB source ranges when present', () => {
    const svc = makeService({
      spec: {
        type: 'LoadBalancer',
        clusterIP: '10.96.0.1',
        loadBalancerSourceRanges: ['10.0.0.0/8', '172.16.0.0/12'],
        ports: [],
      },
    });
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('10.0.0.0/8')).toBeInTheDocument();
    expect(screen.getByText('172.16.0.0/12')).toBeInTheDocument();
  });

  it('shows health check node port when present', () => {
    const svc = makeService({
      spec: {
        type: 'LoadBalancer',
        clusterIP: '10.96.0.1',
        healthCheckNodePort: 30000,
        ports: [],
      },
    });
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByText('30000')).toBeInTheDocument();
  });

  it('shows Endpoints ResourceLinkChip when connectionID provided', () => {
    render(<ServiceStatusSection service={makeService()} connectionID="conn-1" />);
    const chip = screen.getByTestId('resource-link-chip');
    expect(chip).toHaveAttribute('data-resource-key', 'k8s:/endpoints');
    expect(chip).toHaveTextContent('my-svc');
  });

  it('shows conditions via ConditionChip when present', () => {
    const svc = {
      ...makeService(),
      status: {
        conditions: [
          { type: 'Ready', status: 'True', lastTransitionTime: '2024-01-01T00:00:00Z' },
        ],
      },
    } as Service;
    render(<ServiceStatusSection service={svc} />);
    expect(screen.getByTestId('condition-chip')).toHaveTextContent('Ready');
  });
});

// ---------------------------------------------------------------------------
// ServicePortsSection
// ---------------------------------------------------------------------------

describe('ServicePortsSection', () => {
  beforeEach(() => {
    mockPortForwarder = {
      sessions: { data: [] },
      forward: vi.fn(),
      close: vi.fn(),
    };
  });

  it('returns null when no ports', () => {
    const svc = makeService({ spec: { type: 'ClusterIP', ports: [] } });
    const { container } = render(<ServicePortsSection service={svc} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders port entries with name and protocol chip', () => {
    render(<ServicePortsSection service={makeService()} />);
    expect(screen.getByText('http')).toBeInTheDocument();
    expect(screen.getByText('TCP')).toBeInTheDocument();
  });

  it('shows targetPort and nodePort for NodePort services', () => {
    const svc = makeService({
      spec: {
        type: 'NodePort',
        ports: [{ port: 80, targetPort: 8080, nodePort: 30080, protocol: 'TCP', name: 'http' }],
      },
    });
    render(<ServicePortsSection service={svc} />);
    expect(screen.getByText('8080')).toBeInTheDocument();
    expect(screen.getByText('30080')).toBeInTheDocument();
  });

  it('shows appProtocol when present', () => {
    const svc = makeService({
      spec: {
        type: 'ClusterIP',
        ports: [{ port: 443, protocol: 'TCP', name: 'secure', appProtocol: 'https' }],
      },
    });
    render(<ServicePortsSection service={svc} />);
    expect(screen.getByText('https')).toBeInTheDocument();
  });

  it('does not offer forwarding from display-only Service data without an observation', () => {
    render(<ServicePortsSection service={makeService()} connectionID="conn-1" resourceID="my-svc" />);
    expect(screen.getByText('http')).toBeInTheDocument();
    expect(screen.getByText('TCP')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Forward' })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ServiceSidebar (composed)
// ---------------------------------------------------------------------------

describe('ServiceSidebar', () => {
  beforeEach(() => {
    mockPortForwarder = {
      sessions: { data: [] },
      forward: vi.fn(),
      close: vi.fn(),
    };
  });

  it('returns null when ctx.data is undefined', () => {
    const { container } = render(<ServiceSidebar ctx={makeDrawerCtx(undefined)} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders ObjectMetaSection', () => {
    render(<ServiceSidebar ctx={makeDrawerCtx(makeService())} />);
    const meta = screen.getByTestId('object-meta-section');
    expect(meta).toHaveAttribute('data-name', 'my-svc');
  });

  it('renders configuration section with session affinity and traffic policies', () => {
    const svc = makeService({
      spec: {
        type: 'ClusterIP',
        clusterIP: '10.96.0.1',
        sessionAffinity: 'ClientIP',
        externalTrafficPolicy: 'Local',
        ports: [{ port: 80, protocol: 'TCP' }],
        selector: { app: 'my-app' },
      },
    });
    render(<ServiceSidebar ctx={makeDrawerCtx(svc)} />);
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('ClientIP')).toBeInTheDocument();
  });

  it('renders selector KVCard when selector present', () => {
    render(<ServiceSidebar ctx={makeDrawerCtx(makeService())} />);
    const card = screen.getByTestId('kv-card');
    expect(card).toHaveAttribute('data-title', 'Selector');
    expect(screen.getByText('app=my-app')).toBeInTheDocument();
  });

  it('renders full sidebar with all sections', () => {
    const svc = makeService({
      spec: {
        type: 'NodePort',
        clusterIP: '10.96.0.1',
        sessionAffinity: 'None',
        ports: [{ port: 80, targetPort: 8080, nodePort: 30080, protocol: 'TCP', name: 'http' }],
        selector: { app: 'my-app' },
      },
    });
    render(<ServiceSidebar ctx={makeDrawerCtx(svc)} />);
    expect(screen.getByTestId('object-meta-section')).toBeInTheDocument();
    expect(screen.getByText('NodePort')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByTestId('kv-card')).toBeInTheDocument();
    expect(screen.getByText('Ports')).toBeInTheDocument();
  });
});
