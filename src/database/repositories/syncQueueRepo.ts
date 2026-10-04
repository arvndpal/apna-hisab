import { exec } from '../sqlite/client';
import { nowUtcIso } from '../../utils/dates';
import type { SyncQueueItem } from '../../types/models';

type QueueRow = {
  id: number;
  table_name: SyncQueueItem['tableName'];
  row_id: string;
  op: SyncQueueItem['op'];
  attempts: number;
  last_error: string | null;
  created_at: string;
};

function fromRow(r: QueueRow): SyncQueueItem {
  return {
    id: r.id,
    tableName: r.table_name,
    rowId: r.row_id,
    op: r.op,
    attempts: r.attempts,
    lastError: r.last_error,
    createdAt: r.created_at,
  };
}

/** Call inside the same transaction as the row write it queues (see repositories' create/update/softDelete). */
export function enqueue(tableName: SyncQueueItem['tableName'], rowId: string, op: SyncQueueItem['op']): void {
  exec('INSERT INTO sync_queue (table_name, row_id, op, attempts, last_error, created_at) VALUES (?, ?, ?, 0, NULL, ?)', [
    tableName,
    rowId,
    op,
    nowUtcIso(),
  ]);
}

/** Oldest first, batched — the sync engine (Milestone 5) pushes these in order. */
export function listBatch(limit = 100): SyncQueueItem[] {
  return exec('SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT ?', [limit]).rows.map((r) =>
    fromRow(r as unknown as QueueRow),
  );
}

export function remove(id: number): void {
  exec('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export function recordFailure(id: number, error: string): void {
  exec('UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?', [error, id]);
}

export function count(): number {
  return Number(exec('SELECT COUNT(*) AS c FROM sync_queue').rows[0]?.c ?? 0);
}
