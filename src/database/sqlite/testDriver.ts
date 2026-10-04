/**
 * Jest-only SQLite driver backed by better-sqlite3 (plain Node, synchronous — no device needed).
 * Never imported from app code; only from *.test.ts files, so Metro never bundles it.
 */
import Database from 'better-sqlite3';
import type { Driver, ExecResult } from './client';

const CONTROL_STATEMENT = /^\s*(begin|commit|rollback)\b/i;

export function createTestDriver(): Driver {
  const raw = new Database(':memory:');
  raw.pragma('foreign_keys = ON');

  return {
    executeSync(sql: string, params: unknown[] = []): ExecResult {
      if (CONTROL_STATEMENT.test(sql)) {
        raw.exec(sql);
        return { rows: [], rowsAffected: 0 };
      }
      const stmt = raw.prepare(sql);
      // better-sqlite3 knows whether a statement produces rows (SELECT, or a pragma that
      // reports its value) vs. one that doesn't — trust that instead of guessing from SQL text.
      if (stmt.reader) {
        const rows = stmt.all(...(params as never[])) as ExecResult['rows'];
        return { rows, rowsAffected: 0 };
      }
      const info = stmt.run(...(params as never[]));
      return { rows: [], insertId: Number(info.lastInsertRowid), rowsAffected: info.changes };
    },
  };
}
