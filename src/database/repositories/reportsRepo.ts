import { exec } from '../sqlite/client';
import type { Bucket } from '../../features/reports/periods';
import type { CategoryBreakdownRow, DateRange, PaymentMethodBreakdownRow, PaymentMethod, TransactionType } from '../../types/models';

function totalsForRange(userId: string, range: DateRange): { incomePaise: number; expensePaise: number } {
  const row = exec(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_paise END), 0) AS income_paise,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_paise END), 0) AS expense_paise
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL AND occurred_on BETWEEN ? AND ?`,
    [userId, range.from, range.to],
  ).rows[0] as { income_paise: number; expense_paise: number };
  return { incomePaise: Number(row.income_paise), expensePaise: Number(row.expense_paise) };
}

/**
 * `type`-only total per bucket — feeds the trend line. Hourly buckets (the 'today' granularity)
 * all share the same day-level `range`, so their totals come from grouping by the local hour
 * extracted from `occurred_at` instead, keyed off each bucket's `hour`.
 */
function trendSeries(userId: string, buckets: Bucket[], type: TransactionType): number[] {
  if (buckets.length > 0 && buckets[0].hour !== undefined) {
    const day = buckets[0].range.from;
    const rows = exec(
      `SELECT CAST(substr(occurred_at, 12, 2) AS INTEGER) AS hour, SUM(amount_paise) AS amount_paise
       FROM transactions
       WHERE user_id = ? AND deleted_at IS NULL AND type = ? AND occurred_on = ?
       GROUP BY hour`,
      [userId, type, day],
    ).rows as Array<{ hour: number; amount_paise: number }>;
    const byHour = new Map(rows.map((r) => [Number(r.hour), Number(r.amount_paise)]));
    return buckets.map((b) => byHour.get(b.hour!) ?? 0);
  }

  const key = type === 'income' ? 'incomePaise' : 'expensePaise';
  return buckets.map((b) => totalsForRange(userId, b.range)[key]);
}

export function incomeTrend(userId: string, buckets: Bucket[]): number[] {
  return trendSeries(userId, buckets, 'income');
}

export function expenseTrend(userId: string, buckets: Bucket[]): number[] {
  return trendSeries(userId, buckets, 'expense');
}

/** Per-category totals for `type` within `range`, sorted by amount desc, each with its share of the total. */
export function categoryBreakdown(userId: string, range: DateRange, type: TransactionType): CategoryBreakdownRow[] {
  const rows = exec(
    `SELECT category_id, SUM(amount_paise) AS amount_paise, COUNT(*) AS count
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL AND type = ? AND occurred_on BETWEEN ? AND ?
     GROUP BY category_id
     ORDER BY amount_paise DESC`,
    [userId, type, range.from, range.to],
  ).rows as Array<{ category_id: string; amount_paise: number; count: number }>;

  const total = rows.reduce((sum, r) => sum + Number(r.amount_paise), 0);
  return rows.map((r) => ({
    categoryId: r.category_id,
    amountPaise: Number(r.amount_paise),
    count: Number(r.count),
    share: total > 0 ? Number(r.amount_paise) / total : 0,
  }));
}

/** Per-payment-method totals for `type` within `range` — "Payment methods" card (income by method). */
export function paymentMethodBreakdown(
  userId: string,
  range: DateRange,
  type: TransactionType = 'income',
): PaymentMethodBreakdownRow[] {
  const rows = exec(
    `SELECT payment_method, SUM(amount_paise) AS amount_paise, COUNT(*) AS count
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL AND type = ? AND occurred_on BETWEEN ? AND ?
     GROUP BY payment_method
     ORDER BY amount_paise DESC`,
    [userId, type, range.from, range.to],
  ).rows as Array<{ payment_method: PaymentMethod; amount_paise: number; count: number }>;

  const total = rows.reduce((sum, r) => sum + Number(r.amount_paise), 0);
  return rows.map((r) => ({
    paymentMethod: r.payment_method,
    amountPaise: Number(r.amount_paise),
    count: Number(r.count),
    share: total > 0 ? Number(r.amount_paise) / total : 0,
  }));
}

export interface DailyTotal {
  occurredOn: string;
  incomePaise: number;
  expensePaise: number;
  count: number;
}

/** Per-day income/expense/count within `range` — feeds the Financial Calendar's day cells. */
export function dailyTotals(userId: string, range: DateRange): DailyTotal[] {
  const rows = exec(
    `SELECT occurred_on,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_paise END), 0) AS income_paise,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_paise END), 0) AS expense_paise,
       COUNT(*) AS count
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL AND occurred_on BETWEEN ? AND ?
     GROUP BY occurred_on`,
    [userId, range.from, range.to],
  ).rows as Array<{ occurred_on: string; income_paise: number; expense_paise: number; count: number }>;

  return rows.map((r) => ({
    occurredOn: r.occurred_on,
    incomePaise: Number(r.income_paise),
    expensePaise: Number(r.expense_paise),
    count: Number(r.count),
  }));
}

/** Total non-deleted transaction count for `userId`, across all time — drives Reports' empty state (<3 total). */
export function totalTransactionCount(userId: string): number {
  const row = exec('SELECT COUNT(*) AS count FROM transactions WHERE user_id = ? AND deleted_at IS NULL', [
    userId,
  ]).rows[0] as { count: number };
  return Number(row.count);
}
