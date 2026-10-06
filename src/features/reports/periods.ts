/**
 * Period math for Reports (ARCHITECTURE.md §4, SCREENS.md §14). All in device local time; week
 * starts Monday. A period is always anchored to a single representative Date — e.g. for 'month'
 * any date within that month — so stepping and range math stay simple Date arithmetic.
 */
import { toOccurredOn } from '../../utils/dates';
import type { DateRange, ReportPeriod } from '../../types/models';

export type PeriodRange = DateRange;

export interface Bucket {
  range: PeriodRange;
  label: string;
  /** Set only for 'hour' trend buckets — `range` is day-granularity and can't carry the hour itself. */
  hour?: number;
}

function clone(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = clone(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = clone(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = clone(d);
  const day = (r.getDay() + 6) % 7; // Mon=0 .. Sun=6
  return addDays(r, -day);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfQuarter(d: Date): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
}

function endOfQuarter(d: Date): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0);
}

function range(from: Date, to: Date): PeriodRange {
  return { from: toOccurredOn(from), to: toOccurredOn(to) };
}

function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

/** The full [from, to] range covered by `period`, anchored at `anchor`. `custom` is required/used only for period === 'custom'. */
export function getPeriodRange(period: ReportPeriod, anchor: Date, custom?: PeriodRange): PeriodRange {
  switch (period) {
    case 'today':
      return range(anchor, anchor);
    case 'week':
      return range(startOfWeek(anchor), addDays(startOfWeek(anchor), 6));
    case 'month':
      return range(startOfMonth(anchor), endOfMonth(anchor));
    case 'quarter':
      return range(startOfQuarter(anchor), endOfQuarter(anchor));
    case '6m':
      return range(startOfMonth(addMonths(anchor, -5)), endOfMonth(anchor));
    case 'year':
      return range(new Date(anchor.getFullYear(), 0, 1), new Date(anchor.getFullYear(), 11, 31));
    case 'custom':
      return custom ?? range(anchor, anchor);
  }
}

/** Moves the anchor by one period unit (e.g. 'month' + 1 → next month's anchor). No-op for 'custom'. */
export function stepAnchor(period: ReportPeriod, anchor: Date, steps: number): Date {
  switch (period) {
    case 'today':
      return addDays(anchor, steps);
    case 'week':
      return addDays(anchor, 7 * steps);
    case 'month':
      return addMonths(anchor, steps);
    case 'quarter':
      return addMonths(anchor, 3 * steps);
    case '6m':
      return addMonths(anchor, 6 * steps);
    case 'year':
      return new Date(anchor.getFullYear() + steps, anchor.getMonth(), anchor.getDate());
    case 'custom':
      return anchor;
  }
}

/** True once the viewed period reaches today's — the stepper's "next" arrow disables at this point. */
export function isCurrentPeriod(period: ReportPeriod, anchor: Date, today: Date = new Date()): boolean {
  if (period === 'custom') return true;
  return getPeriodRange(period, anchor).to >= getPeriodRange(period, today).to;
}

function fmt(locale: string, opts: Intl.DateTimeFormatOptions, d: Date): string {
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

/** The stepper's display label — "September 2026", "28 Sep – 04 Oct", "Jul – Sep 2026", "2026", etc. */
export function periodLabel(period: ReportPeriod, anchor: Date, language: 'en' | 'hi', custom?: PeriodRange): string {
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const { from, to } = getPeriodRange(period, anchor, custom);
  const fromD = parseLocalDate(from);
  const toD = parseLocalDate(to);

  switch (period) {
    case 'today':
      return fmt(locale, { day: '2-digit', month: 'long', year: 'numeric' }, anchor);
    case 'week':
      return `${fmt(locale, { day: '2-digit', month: 'short' }, fromD)} – ${fmt(locale, { day: '2-digit', month: 'short' }, toD)}`;
    case 'month':
      return fmt(locale, { month: 'long', year: 'numeric' }, anchor);
    case 'quarter':
    case '6m':
      return `${fmt(locale, { month: 'short' }, fromD)} – ${fmt(locale, { month: 'short', year: 'numeric' }, toD)}`;
    case 'year':
      return String(anchor.getFullYear());
    case 'custom':
      return `${fmt(locale, { day: '2-digit', month: 'short', year: 'numeric' }, fromD)} – ${fmt(locale, { day: '2-digit', month: 'short', year: 'numeric' }, toD)}`;
  }
}

export type TrendGranularity = 'hour' | 'day';

/** Trend-chart resolution for the currently viewed period: hourly only for 'today' (a single day
 * has no coarser "day" unit to show), daily for every other period — the trend always shows every
 * day's movement rather than folding weeks/months together, however long the viewed range is. */
export function trendGranularity(period: ReportPeriod): TrendGranularity {
  return period === 'today' ? 'hour' : 'day';
}

/**
 * Sub-divides `range` (the currently viewed period's own span, not a trailing window of past
 * periods — contrast with `barBuckets`) into the trend line's points, per `trendGranularity`.
 */
export function trendBuckets(period: ReportPeriod, range_: PeriodRange, language: 'en' | 'hi'): Bucket[] {
  const granularity = trendGranularity(period);
  const start = parseLocalDate(range_.from);
  const end = parseLocalDate(range_.to);
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  if (granularity === 'hour') {
    return Array.from({ length: 24 }, (_, h) => ({
      range: { from: range_.from, to: range_.from },
      label: fmt(locale, { hour: 'numeric' }, new Date(2020, 0, 1, h)),
      hour: h,
    }));
  }

  const days: Bucket[] = [];
  for (let d = clone(start); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    days.push({ range: range(d, d), label: fmt(locale, { day: '2-digit', month: 'short' }, d) });
  }
  return days;
}
