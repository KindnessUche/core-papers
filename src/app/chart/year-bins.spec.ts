import { binYears, isPlausibleYear, niceScale } from './year-bins';

describe('isPlausibleYear', () => {
  it('accepts real years and rejects noise', () => {
    expect(isPlausibleYear(2021, 2026)).toBe(true);
    expect(isPlausibleYear(2027, 2026)).toBe(true); // forthcoming papers
    expect(isPlausibleYear(2040, 2026)).toBe(false);
    expect(isPlausibleYear(0, 2026)).toBe(false);
    expect(isPlausibleYear(null)).toBe(false);
    expect(isPlausibleYear('2020')).toBe(false);
    expect(isPlausibleYear(2020.5)).toBe(false);
  });
});

describe('binYears', () => {
  it('returns nothing without years', () => {
    expect(binYears([], 20)).toEqual([]);
  });

  it('uses one bin per year when the span is short, keeping empty years', () => {
    const bins = binYears([2020, 2020, 2022], 20);
    expect(bins.map((b) => [b.label, b.count])).toEqual([
      ['2020', 2],
      ['2021', 0],
      ['2022', 1],
    ]);
  });

  it('widens the bins to stay under the limit, aligned to round years', () => {
    const bins = binYears([1946, 1946, 2005, 2013, 2025], 12);
    expect(bins[0].start).toBe(1940);
    expect(bins.length).toBeLessThanOrEqual(12);
    expect(bins.every((b) => b.end - b.start === bins[0].end - bins[0].start)).toBe(true);
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(5);
  });

  it('labels ten-year bins as decades and others as ranges in the tooltip', () => {
    const decades = binYears([1950, 2020], 10);
    expect(decades[0].label).toBe('1950s');
    expect(decades[0].range).toBe('1950–1959');
  });

  it('handles a single year', () => {
    expect(binYears([2019], 10)).toEqual([
      { start: 2019, end: 2019, label: '2019', range: '2019', count: 1 },
    ]);
  });
});

describe('niceScale', () => {
  it.each([
    [0, 1, [0, 1]],
    [3, 3, [0, 1, 2, 3]],
    [4, 4, [0, 1, 2, 3, 4]],
    [7, 8, [0, 2, 4, 6, 8]],
    [9, 10, [0, 5, 10]],
    [23, 30, [0, 10, 20, 30]],
    [100, 100, [0, 50, 100]],
  ])('scales a max of %i', (max, top, ticks) => {
    expect(niceScale(max)).toEqual({ max: top, ticks });
  });

  it('always covers the data in at most four steps', () => {
    for (let max = 1; max <= 100; max++) {
      const scale = niceScale(max);
      expect(scale.max).toBeGreaterThanOrEqual(max);
      expect(scale.ticks.length - 1).toBeLessThanOrEqual(4);
    }
  });
});
