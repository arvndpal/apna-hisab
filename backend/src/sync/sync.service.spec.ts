import { describe, expect, it, vi } from 'vitest';
import { SyncService } from './sync.service.js';
import { DatabaseService } from '../database/database.service.js';

function makeDbStub(queryImpl?: (sql: string, params: unknown[]) => unknown) {
  const query = vi.fn().mockImplementation(async (sql: string, params: unknown[] = []) => queryImpl?.(sql, params) ?? []);
  return { query } as unknown as DatabaseService;
}

describe('SyncService', () => {
  it('push() forces user_id on every row, overriding whatever the client sent', async () => {
    const db = makeDbStub();
    const service = new SyncService(db);

    await service.push('real-user', [{ tableName: 'transactions', row: { id: 't1', user_id: 'someone-else', amount_paise: 500 } }]);

    const [sql, params] = (db.query as any).mock.calls[0];
    expect(sql).toMatch(/^\s*INSERT INTO transactions/);
    // user_id must be the authenticated caller's id, never the client-sent value.
    expect(params).not.toContain('someone-else');
    expect(params).toContain('real-user');
  });

  it('push() only ever writes whitelisted columns, silently dropping unknown client keys', async () => {
    const db = makeDbStub();
    const service = new SyncService(db);

    await service.push('user-1', [{ tableName: 'transactions', row: { id: 't1', amount_paise: 500, evil_column: 'DROP TABLE users;' } }]);

    const [sql] = (db.query as any).mock.calls[0];
    expect(sql).not.toContain('evil_column');
  });

  it('push() issues one upsert per row and reports ok for each', async () => {
    const db = makeDbStub();
    const service = new SyncService(db);

    const results = await service.push('user-1', [
      { tableName: 'transactions', row: { id: 't1' } },
      { tableName: 'transactions', row: { id: 't2' } },
    ]);

    expect(db.query).toHaveBeenCalledTimes(2);
    expect(results).toEqual([
      { tableName: 'transactions', rowId: 't1', status: 'ok' },
      { tableName: 'transactions', rowId: 't2', status: 'ok' },
    ]);
  });

  it('push() reports per-row error status when the query fails', async () => {
    const db = makeDbStub(() => {
      throw new Error('constraint violation');
    });
    const service = new SyncService(db);

    const results = await service.push('user-1', [{ tableName: 'transactions', row: { id: 't1' } }]);

    expect(results).toEqual([{ tableName: 'transactions', rowId: 't1', status: 'error', error: 'constraint violation' }]);
  });

  it('push() rejects a row with no id', async () => {
    const db = makeDbStub();
    const service = new SyncService(db);

    const results = await service.push('user-1', [{ tableName: 'transactions', row: { amount_paise: 500 } }]);

    expect(results).toEqual([{ tableName: 'transactions', rowId: null, status: 'error', error: 'Invalid table or missing id' }]);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('pull() scopes the query to the caller and filters by updated_at', async () => {
    const rows = [{ id: 'row-1', user_id: 'user-1', updated_at: '2026-01-02T00:00:00Z' }];
    const db = makeDbStub(() => rows);
    const service = new SyncService(db);

    const result = await service.pull('user-1', 'transactions', '2026-01-01T00:00:00Z', 500);

    const [sql, params] = (db.query as any).mock.calls[0];
    expect(sql).toContain('FROM transactions');
    expect(sql).toContain('WHERE user_id = $1 AND updated_at > $2');
    expect(params).toEqual(['user-1', '2026-01-01T00:00:00Z', 500]);
    expect(result).toEqual(rows);
  });

  it('pull() defaults since to the epoch when omitted (first pull on a new device)', async () => {
    const db = makeDbStub();
    const service = new SyncService(db);

    await service.pull('user-1', 'transactions', undefined, 500);

    const [, params] = (db.query as any).mock.calls[0];
    expect(params[1]).toBe('1970-01-01T00:00:00Z');
  });
});
