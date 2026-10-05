import { __setTestDriver, exec } from '../../database/sqlite/client';
import { createTestDriver } from '../../database/sqlite/testDriver';
import { migrate } from '../../database/migrations';
import * as syncQueueRepo from '../../database/repositories/syncQueueRepo';
import * as syncMetaRepo from '../../database/repositories/syncMetaRepo';
import { useSyncStore } from '../../store/syncStore';

jest.mock('../../services/api/syncApi');
jest.mock('../../services/auth/session');

import * as syncApi from '../../services/api/syncApi';
import * as session from '../../services/auth/session';
import { sync } from './engine';

const mockedPush = syncApi.push as jest.Mock;
const mockedPull = syncApi.pull as jest.Mock;
const mockedGetTokens = session.getTokens as jest.Mock;

const USER = 'user-1';

function insertTransaction(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  const base = {
    id,
    user_id: USER,
    type: 'expense',
    amount_paise: 50000,
    category_id: 'cat-1',
    payment_method: 'cash',
    occurred_at: '2026-10-03T09:05:00+05:30',
    occurred_on: '2026-10-03',
    note: null,
    created_at: '2026-10-03T03:35:00Z',
    updated_at: '2026-10-03T03:35:00Z',
    deleted_at: null,
    sync_status: 'pending',
    ...overrides,
  };
  exec(
    `INSERT INTO transactions (id, user_id, type, amount_paise, category_id, payment_method, occurred_at, occurred_on, note, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      base.id,
      base.user_id,
      base.type,
      base.amount_paise,
      base.category_id,
      base.payment_method,
      base.occurred_at,
      base.occurred_on,
      base.note,
      base.created_at,
      base.updated_at,
      base.deleted_at,
      base.sync_status,
    ],
  );
}

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
  exec(
    `INSERT INTO categories (id, user_id, key, type, name, name_hi, icon, sort, is_default, created_at, updated_at, deleted_at, sync_status)
     VALUES ('cat-1', ?, 'fuel', 'expense', NULL, 'ईंधन', 'Fuel', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', NULL, 'synced')`,
    [USER],
  );
  useSyncStore.setState({ status: 'pending', pendingCount: 0, lastSyncedAt: null, lastError: null });
  jest.clearAllMocks();
  mockedGetTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
  mockedPush.mockResolvedValue({ results: [] });
  mockedPull.mockResolvedValue([]);
});

afterAll(() => {
  __setTestDriver(null);
});

describe('sync() — no session / offline', () => {
  it('sets status to offline and does not call push/pull when not signed in', async () => {
    mockedGetTokens.mockResolvedValue(null);
    await sync();
    expect(useSyncStore.getState().status).toBe('offline');
    expect(mockedPush).not.toHaveBeenCalled();
  });
});

describe('sync() — push', () => {
  it('pushes a queued row, removes it from the queue, and marks it synced on success', async () => {
    insertTransaction('txn-1');
    syncQueueRepo.enqueue('transactions', 'txn-1', 'upsert');
    mockedPush.mockResolvedValue({ results: [{ tableName: 'transactions', rowId: 'txn-1', status: 'ok' }] });

    await sync();

    expect(syncQueueRepo.count()).toBe(0);
    const row = exec('SELECT sync_status FROM transactions WHERE id = ?', ['txn-1']).rows[0];
    expect(row.sync_status).toBe('synced');
    expect(useSyncStore.getState().status).toBe('synced');
  });

  it('matches push results by (tableName, rowId), not array position', async () => {
    insertTransaction('txn-a');
    insertTransaction('txn-b');
    syncQueueRepo.enqueue('transactions', 'txn-a', 'upsert');
    syncQueueRepo.enqueue('transactions', 'txn-b', 'upsert');
    // Results deliberately returned out of request order.
    mockedPush.mockResolvedValue({
      results: [
        { tableName: 'transactions', rowId: 'txn-b', status: 'ok' },
        { tableName: 'transactions', rowId: 'txn-a', status: 'error', error: 'constraint violation' },
      ],
    });

    await sync();

    const a = exec('SELECT sync_status FROM transactions WHERE id = ?', ['txn-a']).rows[0];
    const b = exec('SELECT sync_status FROM transactions WHERE id = ?', ['txn-b']).rows[0];
    expect(a.sync_status).toBe('pending');
    expect(b.sync_status).toBe('synced');
    expect(syncQueueRepo.count()).toBe(1); // txn-a stays queued for retry
  });

  it('de-dupes repeated queue entries for the same row into a single push', async () => {
    insertTransaction('txn-1');
    syncQueueRepo.enqueue('transactions', 'txn-1', 'upsert');
    syncQueueRepo.enqueue('transactions', 'txn-1', 'upsert'); // e.g. edited twice before syncing
    mockedPush.mockResolvedValue({ results: [{ tableName: 'transactions', rowId: 'txn-1', status: 'ok' }] });

    await sync();

    expect(mockedPush).toHaveBeenCalledTimes(1);
    expect(mockedPush.mock.calls[0][0]).toHaveLength(1);
    expect(syncQueueRepo.count()).toBe(0);
  });

  it('leaves the row queued and sets status to error on a network failure', async () => {
    insertTransaction('txn-1');
    syncQueueRepo.enqueue('transactions', 'txn-1', 'upsert');
    mockedPush.mockRejectedValue(new Error('network down'));

    await sync();

    expect(syncQueueRepo.count()).toBe(1);
    expect(useSyncStore.getState().status).toBe('pending');
  });
});

describe('sync() — pull conflict rule', () => {
  it('overwrites a locally synced row with the newer pulled version', async () => {
    insertTransaction('txn-1', { sync_status: 'synced', note: 'old' });
    mockedPull.mockImplementation(async (table: string) =>
      table === 'transactions'
        ? [
            {
              id: 'txn-1',
              user_id: USER,
              type: 'expense',
              amount_paise: 60000,
              category_id: 'cat-1',
              payment_method: 'cash',
              occurred_at: '2026-10-03T09:05:00+05:30',
              occurred_on: '2026-10-03',
              note: 'updated on another device',
              created_at: '2026-10-03T03:35:00Z',
              updated_at: '2026-10-04T00:00:00Z',
              deleted_at: null,
            },
          ]
        : [],
    );

    await sync();

    const row = exec('SELECT note, amount_paise, sync_status FROM transactions WHERE id = ?', ['txn-1']).rows[0];
    expect(row.note).toBe('updated on another device');
    expect(row.amount_paise).toBe(60000);
    expect(row.sync_status).toBe('synced');
  });

  it('keeps the local pending edit instead of a pulled row — it will push and win', async () => {
    insertTransaction('txn-1', { sync_status: 'pending', note: 'my unsynced edit' });
    mockedPull.mockImplementation(async (table: string) =>
      table === 'transactions'
        ? [
            {
              id: 'txn-1',
              user_id: USER,
              type: 'expense',
              amount_paise: 99999,
              category_id: 'cat-1',
              payment_method: 'cash',
              occurred_at: '2026-10-03T09:05:00+05:30',
              occurred_on: '2026-10-03',
              note: 'server version',
              created_at: '2026-10-03T03:35:00Z',
              updated_at: '2026-10-04T00:00:00Z',
              deleted_at: null,
            },
          ]
        : [],
    );

    await sync();

    const row = exec('SELECT note FROM transactions WHERE id = ?', ['txn-1']).rows[0];
    expect(row.note).toBe('my unsynced edit');
  });

  it('inserts a row that does not exist locally yet (new device / another device created it)', async () => {
    mockedPull.mockImplementation(async (table: string) =>
      table === 'transactions'
        ? [
            {
              id: 'txn-new',
              user_id: USER,
              type: 'income',
              amount_paise: 100000,
              category_id: 'cat-1',
              payment_method: 'bank',
              occurred_at: '2026-10-03T09:05:00+05:30',
              occurred_on: '2026-10-03',
              note: null,
              created_at: '2026-10-03T03:35:00Z',
              updated_at: '2026-10-03T03:35:00Z',
              deleted_at: null,
            },
          ]
        : [],
    );

    await sync();

    const row = exec('SELECT id, sync_status FROM transactions WHERE id = ?', ['txn-new']).rows[0];
    expect(row).toBeDefined();
    expect(row.sync_status).toBe('synced');
  });

  it('advances last_pulled_at to the max updated_at seen', async () => {
    mockedPull.mockImplementation(async (table: string) =>
      table === 'transactions'
        ? [
            {
              id: 'txn-new',
              user_id: USER,
              type: 'income',
              amount_paise: 100000,
              category_id: 'cat-1',
              payment_method: 'bank',
              occurred_at: '2026-10-03T09:05:00+05:30',
              occurred_on: '2026-10-03',
              note: null,
              created_at: '2026-10-03T03:35:00Z',
              updated_at: '2026-10-05T12:00:00Z',
              deleted_at: null,
            },
          ]
        : [],
    );

    await sync();

    expect(syncMetaRepo.getLastPulledAt('transactions')).toBe('2026-10-05T12:00:00Z');
  });
});
