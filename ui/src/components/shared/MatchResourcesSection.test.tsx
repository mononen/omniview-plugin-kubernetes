/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('./ExpandableSections', () => ({
  default: ({ sections }: { sections: Array<{ title: React.ReactNode; children: React.ReactNode }> }) => (
    <div data-testid="expandable-sections">
      {sections.map((s, i) => <div key={i} data-testid="section">{s.title}{s.children}</div>)}
    </div>
  ),
}));

vi.mock('./KVCard', () => ({
  default: ({ title, kvs }: { title: string; kvs: Record<string, string> }) => (
    <div data-testid="kv-card" data-title={title}>
      {Object.entries(kvs).map(([k, v]) => <span key={k}>{k}={v}</span>)}
    </div>
  ),
}));

import MatchResourcesSection from './MatchResourcesSection';

describe('MatchResourcesSection', () => {
  it('returns null when matchResources is undefined', () => {
    const { container } = render(<MatchResourcesSection matchResources={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders resource rules', () => {
    render(<MatchResourcesSection matchResources={{
      resourceRules: [{ operations: ['CREATE'], apiGroups: [''], apiVersions: ['v1'], resources: ['pods'] }],
    }} />);
    expect(screen.getByText('CREATE')).toBeInTheDocument();
  });

  it('renders exclude rules', () => {
    render(<MatchResourcesSection matchResources={{
      excludeResourceRules: [{ operations: ['DELETE'], apiGroups: ['apps'], apiVersions: ['v1'], resources: ['deployments'] }],
    }} />);
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });

  it('renders namespace selector KVCard', () => {
    render(<MatchResourcesSection matchResources={{
      namespaceSelector: { matchLabels: { env: 'prod' } },
    }} />);
    expect(screen.getByTestId('kv-card')).toHaveAttribute('data-title', 'Namespace Selector');
  });

  it('renders object selector KVCard', () => {
    render(<MatchResourcesSection matchResources={{
      objectSelector: { matchLabels: { policy: 'true' } },
    }} />);
    expect(screen.getByTestId('kv-card')).toHaveAttribute('data-title', 'Object Selector');
  });
});
