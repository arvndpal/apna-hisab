import { __setTestDriver, exec } from './sqlite/client';
import { createTestDriver } from './sqlite/testDriver';
import { migrate } from './migrations';
import { seedDefaultCategories } from './seed';
import * as transactionsRepo from './repositories/transactionsRepo';
import * as categoriesRepo from './repositories/categoriesRepo';
import * as syncQueueRepo from './repositories/syncQueueRepo';
import { reassignLocalDataToProfile, wipeLocalData } from './reassignUser';

const OLD_USER = 'local-device-id';
const NEW_USER = 'profile-id';

function categoryId(userId: string, type: 'income' | 'expense', key: string) {
  return categoriesRepo.list(userId, type).find((c) => c.key === key)!.id;
}

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
});

afterAll(() => {
  __setTestDriver(null);
});

describe('reassignLocalDataToProfile', () => {
  it('moves every user-scoped row from the old id to the new one', () => {
    seedDefaultCategories(OLD_USER);
    transactionsRepo.create({
      userId: OLD_USER,
      type: 'expense',
      amountPaise: 10000,
      categoryId: categoryId(OLD_USER, 'expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-01T12:00:00'),
    });

    reassignLocalDataToProfile(OLD_USER, NEW_USER);

    expect(transactionsRepo.list({ userId: OLD_USER })).toHaveLength(0);
    expect(transactionsRepo.list({ userId: NEW_USER })).toHaveLength(1);
    expect(categoriesRepo.list(OLD_USER)).toHaveLength(0);
    expect(categoriesRepo.list(NEW_USER).length).toBeGreaterThan(0);
  });

  it('is a no-op when the ids are already the same', () => {
    seedDefaultCategories(NEW_USER);
    expect(() => reassignLocalDataToProfile(NEW_USER, NEW_USER)).not.toThrow();
    expect(categoriesRepo.list(NEW_USER).length).toBeGreaterThan(0);
  });
});

describe('wipeLocalData', () => {
  it('deletes this user\'s rows across every user-scoped table, and the sync queue/cursor', () => {
    seedDefaultCategories(NEW_USER);
    const txn = transactionsRepo.create({
      userId: NEW_USER,
      type: 'expense',
      amountPaise: 50000,
      categoryId: categoryId(NEW_USER, 'expense', 'food'),
      paymentMethod: 'cash',
      occurredAt: new Date('2026-10-01T12:00:00'),
    });
    exec("INSERT INTO sync_meta (table_name, last_pulled_at) VALUES ('transactions', '2026-10-01T00:00:00Z')");

    wipeLocalData(NEW_USER);

    expect(transactionsRepo.getById(txn.id)).toBeNull();
    expect(transactionsRepo.list({ userId: NEW_USER })).toHaveLength(0);
    expect(categoriesRepo.list(NEW_USER)).toHaveLength(0);
    expect(syncQueueRepo.count()).toBe(0);
    expect(exec('SELECT * FROM sync_meta').rows).toHaveLength(0);
  });

  it('leaves other users\' rows untouched', () => {
    seedDefaultCategories(OLD_USER);
    seedDefaultCategories(NEW_USER);
    transactionsRepo.create({
      userId: OLD_USER,
      type: 'income',
      amountPaise: 20000,
      categoryId: categoryId(OLD_USER, 'income', 'salary'),
      paymentMethod: 'bank',
      occurredAt: new Date('2026-10-01T09:00:00'),
    });

    wipeLocalData(NEW_USER);

    expect(transactionsRepo.list({ userId: OLD_USER })).toHaveLength(1);
    expect(categoriesRepo.list(OLD_USER).length).toBeGreaterThan(0);
  });
});
