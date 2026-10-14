/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { vi, describe, it, expect } from 'vitest';

import SidebarSection from './SidebarSection';

describe('SidebarSection', () => {
  it('renders title', () => {
    render(<SidebarSection title="Configuration"><div>body</div></SidebarSection>);
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('renders children in body', () => {
    render(<SidebarSection title="Test"><span>child content</span></SidebarSection>);
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('renders headerRight when provided', () => {
    render(
      <SidebarSection title="Status" headerRight={<span data-testid="header-right">conditions</span>}>
        <div>body</div>
      </SidebarSection>
    );
    expect(screen.getByTestId('header-right')).toBeInTheDocument();
  });

  it('renders headerLeft when provided', () => {
    render(
      <SidebarSection title="Status" headerLeft={<span data-testid="header-left">Active</span>}>
        <div>body</div>
      </SidebarSection>
    );
    expect(screen.getByTestId('header-left')).toBeInTheDocument();
  });

  it('does not render headerRight when not provided', () => {
    render(<SidebarSection title="Test"><div>body</div></SidebarSection>);
    expect(screen.queryByTestId('header-right')).not.toBeInTheDocument();
  });
});
