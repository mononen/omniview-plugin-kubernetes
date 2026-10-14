/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { vi, describe, it, expect } from 'vitest';

import KVCard from './KVCard';

describe('KVCard', () => {
  it('renders title', () => {
    render(<KVCard title="Labels" kvs={{ app: 'web' }} />);
    expect(screen.getByText('Labels')).toBeInTheDocument();
  });

  it('renders count chip', () => {
    render(<KVCard title="Labels" kvs={{ a: '1', b: '2' }} />);
    const chip = screen.getByText('2', { selector: '[data-ov-color] *, [data-ov-color]' });
    expect(chip.closest('[data-ov-color]')).toHaveAttribute('data-ov-color', 'brand');
  });

  it('renders key-value pairs', () => {
    render(<KVCard title="Labels" kvs={{ app: 'web', tier: 'frontend' }} defaultExpanded />);
    expect(screen.getByText('app')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
  });
});
