import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import ResourceLinkChip from './ResourceLinkChip';

const mocks = vi.hoisted(() => ({
  mockShowResourceSidebar: vi.fn(),
}));

vi.mock('@omniviewdev/runtime', () => ({
  useRightDrawer: () => ({
    showResourceSidebar: (...args: unknown[]) => mocks.mockShowResourceSidebar(...args),
  }),
}));

vi.mock('@omniviewdev/ui', () => ({
  Chip: ({
    label,
    onClick,
  }: {
    label: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
  }) => (
    <button onClick={onClick} type="button">
      {label}
    </button>
  ),
}));

describe('ResourceLinkChip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops click propagation and opens the linked resource sidebar', () => {
    const parentClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <ResourceLinkChip
          pluginID="kubernetes"
          connectionID="conn-1"
          namespace="kube-system"
          resourceID="pod-1"
          resourceKey="core::v1::Pod"
          resourceName="Pod/pod-1"
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pod/pod-1' }));

    expect(parentClick).not.toHaveBeenCalled();
    expect(mocks.mockShowResourceSidebar).toHaveBeenCalledTimes(1);
    expect(mocks.mockShowResourceSidebar).toHaveBeenCalledWith({
      pluginID: 'kubernetes',
      connectionID: 'conn-1',
      resourceKey: 'core::v1::Pod',
      resourceID: 'pod-1',
      resourceName: 'pod-1',
      namespace: 'kube-system',
    });
  });
});
