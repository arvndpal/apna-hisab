import { getPeriodRange, stepAnchor, isCurrentPeriod, periodLabel, trendGranularity, trendBuckets } from './periods';

describe('getPeriodRange', () => {
  it('today is a single day', () => {
    expect(getPeriodRange('today', new Date(2026, 9, 5))).toEqual({ from: '2026-10-05', to: '2026-10-05' });
  });

  it('week starts Monday and ends Sunday', () => {
    // 2026-10-05 is a Monday.
    expect(getPeriodRange('week', new Date(2026, 9, 7))).toEqual({ from: '2026-10-05', to: '2026-10-11' });
  });

  it('month is the full calendar month', () => {
    expect(getPeriodRange('month', new Date(2026, 9, 15))).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('quarter is the full calendar quarter', () => {
    expect(getPeriodRange('quarter', new Date(2026, 9, 15))).toEqual({ from: '2026-10-01', to: '2026-12-31' });
    expect(getPeriodRange('quarter', new Date(2026, 0, 15))).toEqual({ from: '2026-01-01', to: '2026-03-31' });
  });

  it('6m is the current month plus the previous 5', () => {
    expect(getPeriodRange('6m', new Date(2026, 9, 15))).toEqual({ from: '2026-05-01', to: '2026-10-31' });
  });

  it('year is the full calendar year', () => {
    expect(getPeriodRange('year', new Date(2026, 5, 1))).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('custom returns the given range as-is', () => {
    const custom = { from: '2026-02-01', to: '2026-02-14' };
    expect(getPeriodRange('custom', new Date(2026, 9, 15), custom)).toEqual(custom);
  });
});

describe('stepAnchor', () => {
  it('steps month by whole months, preserving sensible day-of-month behavior', () => {
    const next = stepAnchor('month', new Date(2026, 9, 15), 1);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(10); // November
  });

  it('steps week by 7 days', () => {
    const next = stepAnchor('week', new Date(2026, 9, 5), 1);
    expect(getPeriodRange('week', next)).toEqual({ from: '2026-10-12', to: '2026-10-18' });
  });

  it('steps year by whole years', () => {
    const next = stepAnchor('year', new Date(2026, 5, 1), 1);
    expect(next.getFullYear()).toBe(2027);
  });

  it('is a no-op for custom', () => {
    const anchor = new Date(2026, 9, 15);
    expect(stepAnchor('custom', anchor, 1)).toEqual(anchor);
  });
});

describe('isCurrentPeriod', () => {
  const today = new Date(2026, 9, 5);

  it('is true when viewing the period containing today', () => {
    expect(isCurrentPeriod('month', new Date(2026, 9, 1), today)).toBe(true);
  });

  it('is false for a past period', () => {
    expect(isCurrentPeriod('month', new Date(2026, 8, 1), today)).toBe(false);
  });

  it('is always true for custom (stepping is disabled, not just the "next" arrow)', () => {
    expect(isCurrentPeriod('custom', new Date(2020, 0, 1), today)).toBe(true);
  });
});

describe('periodLabel', () => {
  it('formats month as "Month Year"', () => {
    expect(periodLabel('month', new Date(2026, 8, 15), 'en')).toBe('September 2026');
  });

  it('formats year as just the year', () => {
    expect(periodLabel('year', new Date(2026, 0, 1), 'en')).toBe('2026');
  });

  it('formats week as a short date range', () => {
    expect(periodLabel('week', new Date(2026, 9, 7), 'en')).toBe('05 Oct – 11 Oct');
  });
});

describe('trendGranularity', () => {
  it('is hourly only for today; every other period is always daily', () => {
    expect(trendGranularity('today')).toBe('hour');
    expect(trendGranularity('week')).toBe('day');
    expect(trendGranularity('month')).toBe('day');
    expect(trendGranularity('quarter')).toBe('day');
    expect(trendGranularity('6m')).toBe('day');
    expect(trendGranularity('year')).toBe('day');
    expect(trendGranularity('custom')).toBe('day');
  });
});

describe('trendBuckets', () => {
  it('today: 24 hourly buckets all within the same day, tagged with their hour index', () => {
    const range = getPeriodRange('today', new Date(2026, 9, 5));
    const buckets = trendBuckets('today', range, 'en');
    expect(buckets).toHaveLength(24);
    expect(buckets.every((b) => b.range.from === '2026-10-05' && b.range.to === '2026-10-05')).toBe(true);
    expect(buckets.map((b) => b.hour)).toEqual(Array.from({ length: 24 }, (_, h) => h));
  });

  it('week: 7 daily buckets, one per day of the week', () => {
    const range = getPeriodRange('week', new Date(2026, 9, 7));
    const buckets = trendBuckets('week', range, 'en');
    expect(buckets).toHaveLength(7);
    expect(buckets[0].range).toEqual({ from: '2026-10-05', to: '2026-10-05' });
    expect(buckets[6].range).toEqual({ from: '2026-10-11', to: '2026-10-11' });
  });

  it('month: one daily bucket per day in the month, not folded into weeks', () => {
    const range = getPeriodRange('month', new Date(2026, 9, 15)); // October 2026 — 31 days
    const buckets = trendBuckets('month', range, 'en');
    expect(buckets).toHaveLength(31);
    expect(buckets[0].range).toEqual({ from: '2026-10-01', to: '2026-10-01' });
    expect(buckets[30].range).toEqual({ from: '2026-10-31', to: '2026-10-31' });
  });

  it('quarter/year: one daily bucket per day in the range, not folded into months', () => {
    const range = getPeriodRange('quarter', new Date(2026, 9, 15)); // Oct-Dec 2026 — 92 days
    const buckets = trendBuckets('quarter', range, 'en');
    expect(buckets).toHaveLength(92);
    expect(buckets[0].range).toEqual({ from: '2026-10-01', to: '2026-10-01' });
    expect(buckets[91].range).toEqual({ from: '2026-12-31', to: '2026-12-31' });
  });
});
