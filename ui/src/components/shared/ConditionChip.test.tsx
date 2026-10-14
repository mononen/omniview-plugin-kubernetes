/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ConditionChip } from './ConditionChip';

function makeCond(overrides: Record<string, unknown> = {}) {
  return {
    type: 'Available',
    status: 'True',
    lastTransitionTime: '2025-01-01T00:00:00Z',
    message: '',
    reason: '',
    ...overrides,
  };
}

describe('ConditionChip', () => {
  it('shows success color for True status', () => {
    render(<ConditionChip condition={makeCond()} />);
    const chip = screen.getByText('Available').closest('[data-ov-color]');
    expect(chip).toHaveAttribute('data-ov-color', 'success');
    expect(chip).toHaveTextContent('Available');
  });

  it('shows neutral color with opacity for False status (faded default)', () => {
    render(<ConditionChip condition={makeCond({ status: 'False' })} />);
    const chip = screen.getByText('Available').closest('[data-ov-color]');
    expect(chip).toHaveAttribute('data-ov-color', 'neutral');
    expect(chip).toHaveStyle({ opacity: '0.45' });
  });

  it('flips logic when flipped=true', () => {
    render(<ConditionChip condition={makeCond({ status: 'False' })} flipped />);
    const chip = screen.getByText('Available').closest('[data-ov-color]');
    expect(chip).toHaveAttribute('data-ov-color', 'success');
  });

  it('uses custom unhealthy color', () => {
    render(<ConditionChip condition={makeCond({ status: 'False' })} unhealthyColor="danger" />);
    const chip = screen.getByText('Available').closest('[data-ov-color]');
    expect(chip).toHaveAttribute('data-ov-color', 'danger');
  });

  it('renders condition type as label', () => {
    render(<ConditionChip condition={makeCond({ type: 'Progressing' })} />);
    expect(screen.getByText('Progressing')).toBeInTheDocument();
  });
});
