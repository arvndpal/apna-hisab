import { __setTestDriver, exec } from '../../database/sqlite/client';
import { createTestDriver } from '../../database/sqlite/testDriver';
import { migrate } from '../../database/migrations';
import { readRowForPush, cloudRowToLocalParams } from './mappers';

const USER = 'user-1';

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
});

afterAll(() => {
  __setTestDriver(null);
});

describe('readRowForPush', () => {
  it('strips sync_status and coerces SQLite 0/1 to real booleans for is_default', () => {
    exec(
      `INSERT INTO categories (id, user_id, key, type, name, name_hi, icon, sort, is_default, created_at, updated_at, deleted_at, sync_status)
       VALUES ('cat-1', ?, 'salary', 'income', NULL, 'वेतन', 'Briefcase', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', NULL, 'pending')`,
      [USER],
    );

    const row = readRowForPush('categories', 'cat-1');

    expect(row).not.toBeNull();
    expect(row!.is_default).toBe(true);
    expect(row).not.toHaveProperty('sync_status');
    expect(row!.id).toBe('cat-1');
    expect(row!.icon).toBe('Briefcase');
  });

  it('returns null when the row no longer exists locally', () => {
    expect(readRowForPush('transactions', 'missing-id')).toBeNull();
  });
});

describe('cloudRowToLocalParams', () => {
  it('converts a cloud boolean back to SQLite 0/1', () => {
    const params = cloudRowToLocalParams('categories', {
      id: 'cat-1',
      user_id: USER,
      key: 'salary',
      type: 'income',
      name: null,
      name_hi: 'वेतन',
      icon: 'Briefcase',
      sort: 1,
      is_default: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null,
    });

    expect(params.is_default).toBe(1);
  });

  it('leaves non-boolean columns untouched', () => {
    const params = cloudRowToLocalParams('transactions', {
      id: 'txn-1',
      user_id: USER,
      type: 'expense',
      amount_paise: 50000,
      category_id: 'cat-1',
      payment_method: 'cash',
      occurred_at: '2026-10-03T09:05:00+05:30',
      occurred_on: '2026-10-03',
      note: 'Fuel',
      created_at: '2026-10-03T03:35:00Z',
      updated_at: '2026-10-03T03:35:00Z',
      deleted_at: null,
    });

    expect(params.amount_paise).toBe(50000);
    expect(params.note).toBe('Fuel');
  });
});
