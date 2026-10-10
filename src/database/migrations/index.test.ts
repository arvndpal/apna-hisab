import { __setTestDriver, exec } from '../sqlite/client';
import { createTestDriver } from '../sqlite/testDriver';
import { migrate } from './index';

beforeEach(() => {
  __setTestDriver(createTestDriver());
});

afterAll(() => {
  __setTestDriver(null);
});

describe('migrate', () => {
  it('creates every table from schema.sql', () => {
    migrate();
    const tables = exec("SELECT name FROM sqlite_master WHERE type = 'table'").rows.map((r) => r.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'categories',
        'transactions',
        'udhaar_people',
        'udhaar_entries',
        'notes',
        'sync_queue',
        'sync_meta',
        'kv_settings',
      ]),
    );
  });

  it('creates the udhaar balances view', () => {
    migrate();
    const views = exec("SELECT name FROM sqlite_master WHERE type = 'view'").rows.map((r) => r.name);
    expect(views).toContain('v_udhaar_balances');
  });

  it('sets PRAGMA user_version and is idempotent on re-run', () => {
    migrate();
    expect(Number(exec('PRAGMA user_version').rows[0]?.user_version)).toBe(2);
    expect(() => migrate()).not.toThrow();
    expect(Number(exec('PRAGMA user_version').rows[0]?.user_version)).toBe(2);
  });

  it('enforces the amount_paise > 0 check constraint', () => {
    migrate();
    exec(
      `INSERT INTO categories (id, user_id, key, type, name, name_hi, icon, sort, is_default, created_at, updated_at, deleted_at, sync_status)
       VALUES ('c1','u1','food','expense',NULL,'खाना','Utensils',1,1,'now','now',NULL,'pending')`,
    );
    expect(() =>
      exec(
        `INSERT INTO transactions (id, user_id, type, amount_paise, category_id, payment_method, occurred_at, occurred_on, note, created_at, updated_at, deleted_at, sync_status)
         VALUES ('t1','u1','expense',0,'c1','cash','now','2026-01-01',NULL,'now','now',NULL,'pending')`,
      ),
    ).toThrow();
  });
});
