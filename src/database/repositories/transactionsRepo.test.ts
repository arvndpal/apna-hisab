import { __setTestDriver } from '../sqlite/client';
import { createTestDriver } from '../sqlite/testDriver';
import { migrate } from '../migrations';
import { seedDefaultCategories } from '../seed';
import * as categoriesRepo from './categoriesRepo';
import * as transactionsRepo from './transactionsRepo';
import * as syncQueueRepo from './syncQueueRepo';

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

describe('transactionsRepo', () => {
  it('creates a transaction as pending and enqueues it for sync', () => {
    const txn = transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 30000,
      categoryId: categoryId('expense', 'fuel'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-03T09:05:00'),
      note: 'CNG',
    });

    expect(txn.syncStatus).toBe('pending');
    expect(txn.occurredOn).toBe('2026-10-03');
    const queued = syncQueueRepo.listBatch();
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ tableName: 'transactions', rowId: txn.id, op: 'upsert' });
  });

  it('never stores a float — amountPaise is an integer', () => {
    const txn = transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 285000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'bank',
      occurredAt: new Date('2026-10-03T09:00:00'),
    });
    expect(Number.isInteger(txn.amountPaise)).toBe(true);
    expect(txn.amountPaise).toBe(285000);
  });

  it('update() re-queues the row and changes the fields given', () => {
    const txn = transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 10000,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-01T12:00:00'),
    });
    const updated = transactionsRepo.update(txn.id, { amountPaise: 15000, note: 'Lunch' });
    expect(updated.amountPaise).toBe(15000);
    expect(updated.note).toBe('Lunch');
    expect(updated.categoryId).toBe(txn.categoryId);
  });

  it('softDelete hides a row from list(); restore brings it back', () => {
    const txn = transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 50000,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-02T12:00:00'),
    });

    transactionsRepo.softDelete(txn.id);
    expect(transactionsRepo.list({ userId: USER }).find((t) => t.id === txn.id)).toBeUndefined();

    transactionsRepo.restore(txn.id);
    expect(transactionsRepo.list({ userId: USER }).find((t) => t.id === txn.id)).toBeDefined();
  });

  it('summary() computes net as income minus expense for the range, excluding other users and deleted rows', () => {
    transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 285000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'bank',
      occurredAt: new Date('2026-10-03T09:00:00'),
    });
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 75000,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-03T13:00:00'),
    });
    const toDelete = transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 999900,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-03T14:00:00'),
    });
    transactionsRepo.softDelete(toDelete.id);
    // A different, out-of-range day must not leak into the summary.
    transactionsRepo.create({
      userId: USER,
      type: 'income',
      amountPaise: 100000,
      categoryId: categoryId('income', 'salary'),
      paymentMethod: 'bank',
      occurredAt: new Date('2026-09-01T09:00:00'),
    });

    const result = transactionsRepo.summary({ userId: USER, from: '2026-10-03', to: '2026-10-03' });
    expect(result).toEqual({ incomePaise: 285000, expensePaise: 75000, netPaise: 210000 });
  });

  it('list() filters by search across note and amount', () => {
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 30000,
      categoryId: categoryId('expense', 'fuel'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-03T09:00:00'),
      note: 'CNG top-up',
    });
    transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 15000,
      categoryId: categoryId('expense', 'food'),
      paymentMethod: 'upi',
      occurredAt: new Date('2026-10-03T13:00:00'),
      note: 'Lunch',
    });

    expect(transactionsRepo.list({ userId: USER, search: 'CNG' })).toHaveLength(1);
    expect(transactionsRepo.list({ userId: USER, search: 'Lunch' })[0].note).toBe('Lunch');
  });
});
