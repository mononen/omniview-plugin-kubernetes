/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import ObjectMetaSection from './ObjectMetaSection';

const mocks = vi.hoisted(() => ({
  showResourceSidebar: vi.fn(),
}));

vi.mock('@omniviewdev/runtime', () => ({
  useRightDrawer: () => ({ showResourceSidebar: mocks.showResourceSidebar }),
}));

const noOwners = { name: 'x' };

const rsMeta = {
  name: 'web-7d4b9c',
  namespace: 'prod',
  ownerReferences: [
    { apiVersion: 'apps/v1', kind: 'Deployment', name: 'web', uid: 'dep-uid', controller: true },
  ],
};

describe('ObjectMetaSection owners', () => {
  beforeEach(() => vi.clearAllMocks());

  it('links to the owning Deployment when a connection is known', () => {
    render(<ObjectMetaSection data={rsMeta} connectionID="conn-1" />);

    expect(screen.getByText('Owner')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deployment' }));

    expect(mocks.showResourceSidebar).toHaveBeenCalledWith({
      pluginID: 'kubernetes',
      connectionID: 'conn-1',
      resourceKey: 'apps::v1::Deployment',
      resourceID: 'web',
      resourceName: 'web',
      namespace: 'prod',
    });
  });

  it('shows a plain chip without a connection', () => {
    render(<ObjectMetaSection data={rsMeta} />);
    expect(screen.getByText('Deployment')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deployment' })).toBeNull();
  });

  it('omits the row when there are no owners', () => {
    render(<ObjectMetaSection data={noOwners} connectionID="conn-1" />);
    expect(screen.queryByText('Owner')).toBeNull();
  });
});
