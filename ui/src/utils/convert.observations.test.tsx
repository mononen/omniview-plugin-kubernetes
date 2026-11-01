import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import type { Node } from 'kubernetes-types/core/v1';
import { afterEach, describe, expect, it } from 'vitest';
import NodeImagesSection from '../components/kubernetes/sidebar/Node/NodeImagesSection';
import { formatObservedBytes, sumIntegerValues } from './convert';

afterEach(cleanup);

describe('lossless integer observation display', () => {
  it('keeps ordinary restart totals numeric and wide totals exact', () => {
    expect(sumIntegerValues([1, undefined, 2])).toBe(3);
    expect(sumIntegerValues([9007199254740993n, 2])).toBe(9007199254740995n);
    expect(sumIntegerValues([Number.MAX_SAFE_INTEGER, 1])).toBe(9007199254740992n);
  });

  it('keeps wide byte counts exact without changing normal compact units', () => {
    expect(formatObservedBytes(2000000, 'MB')).toBe('2MB');
    expect(formatObservedBytes(9007199254740993n, 'MB')).toBe('9007199254740993B');
  });

  it('renders mixed native node image sizes without bigint arithmetic errors or rounding', () => {
    const node = { status: { images: [
      { names: ['wide'], sizeBytes: 9007199254740993n },
      { names: ['small'], sizeBytes: 2 },
    ] } } as unknown as Node;
    render(<NodeImagesSection node={node} />);
    expect(screen.getByText('9007199254740995B')).toBeTruthy();
    expect(screen.getByText('9007199254740993B')).toBeTruthy();
  });
});
