import { authedFetch } from './client';
import type { SyncQueueItem } from '../../types/models';

export type SyncedTable = SyncQueueItem['tableName'];

export interface PushChange {
  tableName: SyncedTable;
  row: Record<string, unknown>;
}

export interface PushResult {
  tableName: SyncedTable;
  rowId: string | null;
  status: 'ok' | 'error';
  error?: string;
}

export function push(changes: PushChange[]): Promise<{ results: PushResult[] }> {
  return authedFetch('/sync/push', { method: 'POST', body: JSON.stringify({ changes }) });
}

export async function pull(table: SyncedTable, since: string | null, limit = 500): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({ table, limit: String(limit) });
  if (since) params.set('since', since);
  const result = await authedFetch<{ rows: Record<string, unknown>[] }>(`/sync/pull?${params.toString()}`);
  return result.rows;
}
