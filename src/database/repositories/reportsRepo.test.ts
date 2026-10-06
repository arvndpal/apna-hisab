import { __setTestDriver } from '../sqlite/client';
import { createTestDriver } from '../sqlite/testDriver';
import { migrate } from '../migrations';
import { seedDefaultCategories } from '../seed';
import * as categoriesRepo from './categoriesRepo';
import * as transactionsRepo from './transactionsRepo';
import * as reportsRepo from './reportsRepo';
import { trendBuckets, getPeriodRange } from '../../features/reports/periods';

const USER = 'user-1';

function categoryId(type: 'income' | 'expense', key: string) {
  return categoriesRepo.list(USER, type).find((c) => c.key === key)!.id;
}

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
  seedDefaultCategories(USER);
});

afterAll(() => {
  __setTestDriver(null);
});

describe('incomeTrend', () => {
  it('buckets by local hour when trending "today", ignoring expenses', () => {
    transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 50000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'upi',
      occurredAt: new Date('2026-10-05T09:30:00'),
    });
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 20000,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-05T09:45:00'),
    });

    const range = getPeriodRange('today', new Date(2026, 9, 5));
    const buckets = trendBuckets('today', range, 'en');
    const trend = reportsRepo.incomeTrend(USER, buckets);

    expect(trend).toHaveLength(24);
    expect(trend[9]).toBe(50000);
    expect(trend.filter((_, h) => h !== 9).every((v) => v === 0)).toBe(true);
  });

  it('buckets by day when trending a week', () => {
    transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 70000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'bank',
      occurredAt: new Date('2026-10-07T09:00:00'),
    });

    const range = getPeriodRange('week', new Date(2026, 9, 7));
    const buckets = trendBuckets('week', range, 'en');
    const trend = reportsRepo.incomeTrend(USER, buckets);

    expect(trend).toHaveLength(7);
    expect(trend.reduce((a, b) => a + b, 0)).toBe(70000);
  });
});

describe('expenseTrend', () => {
  it('buckets by local hour when trending "today", ignoring income', () => {
    transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 50000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'upi',
      occurredAt: new Date('2026-10-05T09:30:00'),
    });
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 20000,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-05T14:15:00'),
    });

    const range = getPeriodRange('today', new Date(2026, 9, 5));
    const buckets = trendBuckets('today', range, 'en');
    const trend = reportsRepo.expenseTrend(USER, buckets);

    expect(trend).toHaveLength(24);
    expect(trend[14]).toBe(20000);
    expect(trend.filter((_, h) => h !== 14).every((v) => v === 0)).toBe(true);
  });

  it('buckets by day when trending a week', () => {
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 30000,
      categoryId: categoryId('expense', 'fuel'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-07T09:00:00'),
    });

    const range = getPeriodRange('week', new Date(2026, 9, 7));
    const buckets = trendBuckets('week', range, 'en');
    const trend = reportsRepo.expenseTrend(USER, buckets);

    expect(trend).toHaveLength(7);
    expect(trend.reduce((a, b) => a + b, 0)).toBe(30000);
  });
});

describe('categoryBreakdown', () => {
  it('groups by category with amount, count, and a share that sums to 1', () => {
    const fuelId = categoryId('expense', 'fuel');
    const foodId = categoryId('expense', 'food');
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 30000,
      categoryId: fuelId,
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-03T09:00:00'),
    });
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 10000,
      categoryId: foodId,
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-03T13:00:00'),
    });
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 10000,
      categoryId: foodId,
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-04T13:00:00'),
    });

    const rows = reportsRepo.categoryBreakdown(USER, { from: '2026-10-01', to: '2026-10-31' }, 'expense');

    expect(rows).toEqual([
      { categoryId: fuelId, amountPaise: 30000, count: 1, share: 0.6 },
      { categoryId: foodId, amountPaise: 20000, count: 2, share: 0.4 },
    ]);
  });

  it('is empty (not an error) for a range with no matching transactions', () => {
    expect(reportsRepo.categoryBreakdown(USER, { from: '2026-01-01', to: '2026-01-31' }, 'income')).toEqual([]);
  });
});

describe('paymentMethodBreakdown', () => {
  it('groups income by payment method with a share that sums to 1', () => {
    transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 80000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'bank',
      occurredAt: new Date('2026-10-01T09:00:00'),
    });
    transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 20000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'upi',
      occurredAt: new Date('2026-10-02T09:00:00'),
    });
    // An expense in the same range must never leak into an income breakdown.
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 99999,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'bank',
      occurredAt: new Date('2026-10-02T09:00:00'),
    });

    const rows = reportsRepo.paymentMethodBreakdown(USER, { from: '2026-10-01', to: '2026-10-31' }, 'income');

    expect(rows).toEqual([
      { paymentMethod: 'bank', amountPaise: 80000, count: 1, share: 0.8 },
      { paymentMethod: 'upi', amountPaise: 20000, count: 1, share: 0.2 },
    ]);
  });
});

describe('totalTransactionCount', () => {
  it('counts non-deleted transactions across all time, scoped to the user', () => {
    transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 1000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'cash',
      occurredAt: new Date('2020-01-01T09:00:00'),
    });
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 1000,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-05T09:00:00'),
    });
    const deleted = transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 1000,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-05T09:00:00'),
    });
    transactionsRepo.softDelete(deleted.id);

    expect(reportsRepo.totalTransactionCount(USER)).toBe(2);
    expect(reportsRepo.totalTransactionCount('someone-else')).toBe(0);
  });
});

describe('dailyTotals', () => {
  it('groups income and expense by day, one row per day that has activity', () => {
    transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 50000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'bank',
      occurredAt: new Date('2026-10-05T09:00:00'),
    });
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 20000,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-05T13:00:00'),
    });
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 10000,
      categoryId: categoryId('expense', 'fuel'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-06T09:00:00'),
    });

    const rows = reportsRepo.dailyTotals(USER, { from: '2026-10-01', to: '2026-10-31' });

    expect(rows).toHaveLength(2);
    const oct5 = rows.find((r) => r.occurredOn === '2026-10-05')!;
    const oct6 = rows.find((r) => r.occurredOn === '2026-10-06')!;
    expect(oct5).toMatchObject({ incomePaise: 50000, expensePaise: 20000, count: 2 });
    expect(oct6).toMatchObject({ incomePaise: 0, expensePaise: 10000, count: 1 });
  });

  it('is empty for a range with no transactions', () => {
    expect(reportsRepo.dailyTotals(USER, { from: '2020-01-01', to: '2020-01-31' })).toEqual([]);
  });
});
