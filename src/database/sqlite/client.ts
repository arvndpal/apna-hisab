/**
 * Thin driver-agnostic SQLite client. Production uses @op-engineering/op-sqlite (synchronous,
 * JSI); tests inject a better-sqlite3-backed driver via __setTestDriver so repositories can be
 * exercised against real SQL without a device (see database/sqlite/testDriver.ts).
 */
import type { DB } from '@op-engineering/op-sqlite';

export type Row = Record<string, unknown>;
export type ExecResult = { rows: Row[]; insertId?: number; rowsAffected: number };
export type Driver = { executeSync: (sql: string, params?: any[]) => ExecResult };

export type WatchedTable = 'transactions' | 'categories' | 'udhaar_people' | 'udhaar_entries' | 'notes';
const WATCHED_TABLES: ReadonlySet<string> = new Set([
  'transactions',
  'categories',
  'udhaar_people',
  'udhaar_entries',
  'notes',
]);

type Listener = () => void;
const listeners = new Map<WatchedTable, Set<Listener>>();

function notify(table: WatchedTable) {
  listeners.get(table)?.forEach((l) => l());
}

/** Re-runs `listener` whenever any row in `table` changes (insert/update/delete, including soft deletes). */
export function onChange(table: WatchedTable, listener: Listener): () => void {
  if (!listeners.has(table)) listeners.set(table, new Set());
  listeners.get(table)!.add(listener);
  return () => listeners.get(table)?.delete(listener);
}

let testDriver: Driver | null = null;
let opDb: DB | null = null;

/** Test-only hook: inject a driver (see testDriver.ts) and bypass op-sqlite entirely. */
export function __setTestDriver(driver: Driver | null) {
  testDriver = driver;
  opDb = null;
}

function getDriver(): Driver {
  if (testDriver) return testDriver;
  if (!opDb) {
    // Required lazily: its module import touches NativeModules, which doesn't exist under Jest.
    const { open } = require('@op-engineering/op-sqlite') as typeof import('@op-engineering/op-sqlite');
    opDb = open({ name: 'apnahisab.db' });
    opDb.updateHook((params) => {
      if (WATCHED_TABLES.has(params.table)) notify(params.table as WatchedTable);
    });
  }
  return opDb;
}

/** Synchronous — every call blocks the JS thread briefly but returns instantly (no network). */
export function exec(sql: string, params: any[] = []): ExecResult {
  return getDriver().executeSync(sql, params);
}

/** Wraps writes in BEGIN/COMMIT, rolling back on throw. Keep transactions short and synchronous. */
export function runInTransaction<T>(fn: () => T): T {
  exec('BEGIN');
  try {
    const result = fn();
    exec('COMMIT');
    return result;
  } catch (e) {
    exec('ROLLBACK');
    throw e;
  }
}
