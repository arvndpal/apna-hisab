import { exec } from '../../database/sqlite/client';
import type { SyncedTable } from '../../services/api/syncApi';

/** Exact column order per table, matching both src/database/schema.sql and the cloud schema (sync_status is local-only and never included). */
export const TABLE_COLUMNS: Record<SyncedTable, readonly string[]> = {
  categories: ['id', 'user_id', 'key', 'type', 'name', 'name_hi', 'icon', 'sort', 'is_default', 'created_at', 'updated_at', 'deleted_at'],
  transactions: [
    'id',
    'user_id',
    'type',
    'amount_paise',
    'category_id',
    'payment_method',
    'occurred_at',
    'occurred_on',
    'note',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  udhaar_people: ['id', 'user_id', 'name', 'phone', 'created_at', 'updated_at', 'deleted_at'],
  udhaar_entries: [
    'id',
    'user_id',
    'person_id',
    'direction',
    'amount_paise',
    'occurred_at',
    'occurred_on',
    'note',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  notes: ['id', 'user_id', 'title', 'body', 'created_at', 'updated_at', 'deleted_at'],
};

/** SQLite stores booleans as 0/1; Postgres expects real booleans. */
const BOOLEAN_COLUMNS: Partial<Record<SyncedTable, readonly string[]>> = {
  categories: ['is_default'],
};

/** Reads the current local row by id and maps it to the shape /sync/push expects (strips sync_status, coerces booleans). Null if the row no longer exists locally. */
export function readRowForPush(table: SyncedTable, id: string): Record<string, unknown> | null {
  const row = exec(`SELECT * FROM ${table} WHERE id = ?`, [id]).rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const booleanCols = BOOLEAN_COLUMNS[table] ?? [];
  const mapped: Record<string, unknown> = {};
  for (const col of TABLE_COLUMNS[table]) {
    mapped[col] = booleanCols.includes(col) ? Boolean(row[col]) : row[col];
  }
  return mapped;
}

/** Converts a pulled cloud row into local SQLite column values — inverse of readRowForPush's boolean coercion. */
export function cloudRowToLocalParams(table: SyncedTable, row: Record<string, unknown>): Record<string, unknown> {
  const booleanCols = BOOLEAN_COLUMNS[table] ?? [];
  const mapped: Record<string, unknown> = {};
  for (const col of TABLE_COLUMNS[table]) {
    mapped[col] = booleanCols.includes(col) ? (row[col] ? 1 : 0) : row[col];
  }
  return mapped;
}
