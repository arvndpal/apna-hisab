import { exec } from '../sqlite/client';
import type { SyncQueueItem } from '../../types/models';

export type SyncedTable = SyncQueueItem['tableName'];

/** `null` means never pulled — the engine passes no `since` and does a full pull for that table. */
export function getLastPulledAt(table: SyncedTable): string | null {
  const row = exec('SELECT last_pulled_at FROM sync_meta WHERE table_name = ?', [table]).rows[0];
  return (row?.last_pulled_at as string | null | undefined) ?? null;
}

export function setLastPulledAt(table: SyncedTable, iso: string): void {
  exec(
    `INSERT INTO sync_meta (table_name, last_pulled_at) VALUES (?, ?)
     ON CONFLICT(table_name) DO UPDATE SET last_pulled_at = excluded.last_pulled_at`,
    [table, iso],
  );
}
