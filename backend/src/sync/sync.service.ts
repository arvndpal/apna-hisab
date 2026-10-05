import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { isSyncedTable, SYNCED_TABLES, TABLE_COLUMNS, type SyncedTable } from './sync.constants.js';
import type { PushChangeDto } from './dto/push.dto.js';

export interface PushResult {
  tableName: SyncedTable;
  rowId: string | null;
  status: 'ok' | 'error';
  error?: string;
}

/** Quotes a Postgres identifier, after asserting it's one of our own known-safe column names. */
function safeColumn(table: SyncedTable, column: string): string {
  if (!TABLE_COLUMNS[table].includes(column)) {
    throw new Error(`Unknown column "${column}" for table "${table}"`);
  }
  return `"${column}"`;
}

@Injectable()
export class SyncService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Upserts each change, forcing user_id to the authenticated caller — the row's own user_id (if
   * the client sent one) is never trusted. Only columns in TABLE_COLUMNS are ever written; any
   * other key on the client's row is silently dropped. One parameterized upsert per row.
   */
  async push(userId: string, changes: PushChangeDto[]): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (const change of changes) {
      const { tableName } = change;
      const rowId = typeof change.row.id === 'string' ? change.row.id : null;

      if (!isSyncedTable(tableName) || !rowId) {
        results.push({ tableName, rowId, status: 'error', error: 'Invalid table or missing id' });
        continue;
      }

      const row: Record<string, unknown> = { ...change.row, user_id: userId };
      const columns = TABLE_COLUMNS[tableName].filter((c) => c in row);
      const values = columns.map((c) => row[c]);
      const quotedColumns = columns.map((c) => safeColumn(tableName, c));
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const updateSet = quotedColumns
        .filter((c) => c !== '"id"')
        .map((c) => `${c} = EXCLUDED.${c}`)
        .join(', ');

      const sql = `
        INSERT INTO ${tableName} (${quotedColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
        ON CONFLICT (id) DO UPDATE SET ${updateSet}
      `;

      try {
        await this.db.query(sql, values);
        results.push({ tableName, rowId, status: 'ok' });
      } catch (e) {
        results.push({ tableName, rowId, status: 'error', error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    return results;
  }

  /** Rows for one table changed since `since`, oldest first, scoped to the caller. */
  async pull(userId: string, table: SyncedTable, since: string | undefined, limit: number): Promise<Record<string, unknown>[]> {
    if (!isSyncedTable(table)) throw new Error('Unknown table: ' + String(table));

    return this.db.query(
      `SELECT * FROM ${table} WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at ASC LIMIT $3`,
      [userId, since ?? '1970-01-01T00:00:00Z', limit],
    );
  }

  get syncedTables(): readonly SyncedTable[] {
    return SYNCED_TABLES;
  }
}
