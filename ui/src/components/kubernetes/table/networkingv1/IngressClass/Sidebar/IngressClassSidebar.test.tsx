/// <reference types="@testing-library/jest-dom/vitest" />
import type { DrawerContext } from '@omniviewdev/runtime';
import { render, screen } from '@testing-library/react';
import type { IngressClass } from 'kubernetes-types/networking/v1';
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

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import IngressClassSidebar from './index';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeIngressClass(overrides: Partial<IngressClass> = {}): IngressClass {
  return {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'IngressClass',
    metadata: { name: 'nginx', uid: 'ic-123' },
    spec: {
      controller: 'k8s.io/ingress-nginx',
    },
    ...overrides,
  };
}

function makeDrawerCtx(data: IngressClass | undefined): DrawerContext<IngressClass> {
  return {
    data,
    resource: { connectionID: 'conn-1', id: 'nginx' },
  } as DrawerContext<IngressClass>;
}

// ---------------------------------------------------------------------------
// IngressClassSidebar
// ---------------------------------------------------------------------------

describe('IngressClassSidebar', () => {
  it('returns null when ctx.data is undefined', () => {
    const { container } = render(<IngressClassSidebar ctx={makeDrawerCtx(undefined)} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders ObjectMetaSection with correct name', () => {
    render(<IngressClassSidebar ctx={makeDrawerCtx(makeIngressClass())} />);
    const meta = screen.getByTestId('object-meta-section');
    expect(meta).toHaveAttribute('data-name', 'nginx');
  });

  it('renders controller name', () => {
    render(<IngressClassSidebar ctx={makeDrawerCtx(makeIngressClass())} />);
    expect(screen.getByText('k8s.io/ingress-nginx')).toBeInTheDocument();
  });

  it('shows "Default" chip when is-default-class annotation is set', () => {
    const ic = makeIngressClass({
      metadata: {
        name: 'nginx',
        annotations: { 'ingressclass.kubernetes.io/is-default-class': 'true' },
      },
    });
    render(<IngressClassSidebar ctx={makeDrawerCtx(ic)} />);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('hides "Default" chip when annotation is absent', () => {
    render(<IngressClassSidebar ctx={makeDrawerCtx(makeIngressClass())} />);
    expect(screen.queryByText('Default')).not.toBeInTheDocument();
  });

  it('renders parameters section when spec.parameters exists', () => {
    const ic = makeIngressClass({
      spec: {
        controller: 'k8s.io/ingress-nginx',
        parameters: {
          apiGroup: 'example.com',
          kind: 'IngressParameters',
          name: 'my-params',
          namespace: 'default',
          scope: 'Namespace',
        },
      },
    });
    render(<IngressClassSidebar ctx={makeDrawerCtx(ic)} />);
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('my-params')).toBeInTheDocument();
  });

  it('hides parameters section when no parameters', () => {
    render(<IngressClassSidebar ctx={makeDrawerCtx(makeIngressClass())} />);
    expect(screen.queryByText('Parameters')).not.toBeInTheDocument();
  });
});
