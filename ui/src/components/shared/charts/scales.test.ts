import { describe, expect, it } from 'vitest';

import { formatBytes, formatPercent, formatRate, getValueFormatter } from './formatters';
import {
  alignSeries,
  arcPath,
  buildAreaPath,
  buildLinePath,
  computeDonutArcs,
  linearScale,
  nearestIndex,
  niceTicks,
  resolveChartColor,
  seriesColor,
  timeTicks,
  valueExtent,
} from './scales';
import { matchPreset, DEFAULT_TIME_RANGE_PRESETS } from './timeRange';

describe('linearScale', () => {
  it('maps domain to range, including inverted ranges', () => {
    const s = linearScale([0, 10], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(5)).toBe(50);
    expect(s(10)).toBe(0);
  });
  it('handles a degenerate domain', () => {
    expect(linearScale([3, 3], [7, 9])(3)).toBe(7);
  });
});

describe('niceTicks', () => {
  it('rounds the extent outward to nice steps', () => {
    const r = niceTicks(0, 87, 4);
    expect(r.min).toBe(0);
    expect(r.max).toBe(100);
    expect(r.ticks).toEqual([0, 25, 50, 75, 100]);
  });
  it('widens a flat extent', () => {
    const r = niceTicks(0, 0);
    expect(r.max).toBeGreaterThan(r.min);
    const r2 = niceTicks(5, 5);
    expect(r2.min).toBe(0);
    expect(r2.max).toBeGreaterThanOrEqual(5);
  });
  it('avoids floating point drift', () => {
    expect(niceTicks(0, 0.3, 3).ticks).toEqual([0, 0.1, 0.2, 0.3]);
  });
});

describe('timeTicks', () => {
  it('produces aligned ticks inside the range', () => {
    const from = Date.UTC(2026, 0, 1, 10, 7);
    const to = from + 60 * 60 * 1000;
    const ticks = timeTicks(from, to, 4);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    for (const t of ticks) {
      expect(t).toBeGreaterThanOrEqual(from);
      expect(t).toBeLessThanOrEqual(to);
      expect(t % (15 * 60 * 1000)).toBe(0);
    }
  });
  it('returns nothing for an empty range', () => {
    expect(timeTicks(5, 5)).toEqual([]);
  });
});

describe('alignSeries / valueExtent', () => {
  it('unifies timestamps and fills gaps with null', () => {
    const { timestamps, values } = alignSeries([
      { id: 'a', label: 'A', data: [{ timestamp: 1, value: 1 }, { timestamp: 3, value: 3 }] },
      { id: 'b', label: 'B', data: [{ timestamp: 2, value: 20 }, { timestamp: 3, value: 30 }] },
    ]);
    expect(timestamps).toEqual([1, 2, 3]);
    expect(values).toEqual([
      [1, null, 3],
      [null, 20, 30],
    ]);
    expect(valueExtent(values)).toEqual([1, 30]);
    expect(valueExtent([[null]])).toBeUndefined();
  });
});

describe('path builders', () => {
  it('breaks lines at nulls', () => {
    expect(buildLinePath([0, 10, 20, 30], [5, 6, null, 8])).toBe('M0,5L10,6M30,8');
  });
  it('closes each contiguous area run on the baseline', () => {
    expect(buildAreaPath([0, 10, 20], [5, 6, null], 100)).toBe('M0,100L0,5L10,6L10,100Z');
    expect(buildAreaPath([0, 10], [null, null], 100)).toBe('');
  });
});

describe('nearestIndex', () => {
  it('finds the closest timestamp', () => {
    const ts = [0, 10, 20, 30];
    expect(nearestIndex(ts, -5)).toBe(0);
    expect(nearestIndex(ts, 14)).toBe(1);
    expect(nearestIndex(ts, 16)).toBe(2);
    expect(nearestIndex(ts, 99)).toBe(3);
    expect(nearestIndex([], 1)).toBe(-1);
  });
});

describe('donut helpers', () => {
  it('splits the circle proportionally and skips empty slices', () => {
    const arcs = computeDonutArcs([
      { value: 1, color: 'a' },
      { value: 0, color: 'b' },
      { value: 3, color: 'c' },
    ]);
    expect(arcs.map((a) => a.index)).toEqual([0, 2]);
    expect(arcs[0].end - arcs[0].start).toBeCloseTo(Math.PI / 2);
    expect(arcs[1].end).toBeCloseTo(Math.PI * 2);
    expect(computeDonutArcs([{ value: 0, color: 'x' }])).toEqual([]);
  });
  it('builds a closed annular path', () => {
    const d = arcPath(50, 50, 10, 20, 0, Math.PI / 2);
    expect(d.startsWith('M50,30A20,20')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });
});

describe('colours', () => {
  it('maps semantic names to tokens and passes CSS through', () => {
    expect(resolveChartColor('success')).toBe('var(--ov-color-success)');
    expect(resolveChartColor('#123456')).toBe('#123456');
    expect(seriesColor(0)).toBe('var(--ov-color-brand-500)');
    expect(seriesColor(1, undefined, ['red', 'blue'])).toBe('blue');
  });
});

describe('formatters', () => {
  it('formats values per preset', () => {
    expect(formatBytes(1536)).toBe('1.5 KiB');
    expect(formatBytes(2 * 1024 ** 3, '/s')).toBe('2 /s');
    expect(formatPercent(42.26)).toBe('42.3%');
    expect(formatRate(1500)).toBe('1.5 k/s');
    expect(getValueFormatter('percent')(null)).toBe('–');
    expect(getValueFormatter('bytes', '/s')(512)).toBe('512 /s');
  });
  it('matches the closest preset', () => {
    const now = Date.now();
    const p = matchPreset({ from: new Date(now - 50 * 60_000), to: new Date(now) }, DEFAULT_TIME_RANGE_PRESETS);
    expect(p.label).toBe('1h');
  });
});
