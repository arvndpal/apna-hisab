import NetInfo from '@react-native-community/netinfo';
import { exec, runInTransaction } from '../../database/sqlite/client';
import * as syncQueueRepo from '../../database/repositories/syncQueueRepo';
import * as syncMetaRepo from '../../database/repositories/syncMetaRepo';
import * as syncApi from '../../services/api/syncApi';
import type { SyncedTable } from '../../services/api/syncApi';
import { readRowForPush, cloudRowToLocalParams, TABLE_COLUMNS } from './mappers';
import { getTokens } from '../../services/auth/session';
import { useSyncStore } from '../../store/syncStore';
import { showToast } from '../../store/toastStore';
import i18n from '../../i18n';

const SYNCED_TABLES: SyncedTable[] = ['categories', 'transactions', 'udhaar_people', 'udhaar_entries'];
const DEBOUNCE_MS = 2000;
/** 30s → 2m → 10m, then holds at 10m until success or reconnect (ARCHITECTURE.md §6). */
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000];

let syncing = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let netUnsubscribe: (() => void) | null = null;
let wasOffline = false;

function refreshPendingCount(): void {
  useSyncStore.getState().setPendingCount(syncQueueRepo.count());
}

/** Pushes every currently queued row, oldest first, in batches of 100. Returns false if any row failed. */
async function pushAll(): Promise<boolean> {
  let allOk = true;

  for (;;) {
    const batch = syncQueueRepo.listBatch(100);
    if (batch.length === 0) return allOk;

    // De-dupe same (table, rowId) entries within a batch — rapid repeat edits before a sync queue several
    // entries for the same row; they'd all read the same current state, so push it once and resolve together.
    type Pending = { queueIds: number[]; tableName: SyncedTable; row: Record<string, unknown> };
    const byKey = new Map<string, Pending>();
    for (const item of batch) {
      const row = readRowForPush(item.tableName, item.rowId);
      if (!row) {
        // Row no longer exists locally (shouldn't normally happen — soft delete keeps the row). Drop the stale entry.
        syncQueueRepo.remove(item.id);
        continue;
      }
      const key = `${item.tableName}:${item.rowId}`;
      const existing = byKey.get(key);
      if (existing) existing.queueIds.push(item.id);
      else byKey.set(key, { queueIds: [item.id], tableName: item.tableName, row });
    }

    const pending = [...byKey.values()];
    if (pending.length === 0) continue;

    let results: syncApi.PushResult[];
    try {
      const response = await syncApi.push(pending.map(({ tableName, row }) => ({ tableName, row })));
      results = response.results;
    } catch {
      return false; // network/auth failure — stop here, caller schedules a retry
    }

    for (const item of pending) {
      const result = results.find((r) => r.tableName === item.tableName && r.rowId === item.row.id);
      if (result?.status === 'ok') {
        for (const queueId of item.queueIds) syncQueueRepo.remove(queueId);
        exec(`UPDATE ${item.tableName} SET sync_status = 'synced' WHERE id = ? AND updated_at = ?`, [
          item.row.id,
          item.row.updated_at,
        ]);
      } else {
        allOk = false;
        for (const queueId of item.queueIds) syncQueueRepo.recordFailure(queueId, result?.error ?? 'Unknown error');
      }
    }
    refreshPendingCount();
    if (batch.length < 100) return allOk;
  }
}

/** Last-write-wins: a pulled row only overwrites local state if the local row isn't itself a pending (unsynced) edit. */
function applyPulledRow(table: SyncedTable, cloudRow: Record<string, unknown>): void {
  const id = cloudRow.id as string;
  const local = exec(`SELECT sync_status FROM ${table} WHERE id = ?`, [id]).rows[0] as { sync_status?: string } | undefined;
  if (local?.sync_status === 'pending') return;

  const params = cloudRowToLocalParams(table, cloudRow);
  const columns = TABLE_COLUMNS[table];
  const placeholders = columns.map(() => '?').join(', ');
  const updateSet = columns
    .filter((c) => c !== 'id')
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');

  exec(
    `INSERT INTO ${table} (${columns.join(', ')}, sync_status) VALUES (${placeholders}, 'synced')
     ON CONFLICT(id) DO UPDATE SET ${updateSet}, sync_status = 'synced'`,
    columns.map((c) => params[c]),
  );
}

async function pullTable(table: SyncedTable): Promise<void> {
  let since = syncMetaRepo.getLastPulledAt(table);
  for (;;) {
    const rows = await syncApi.pull(table, since, 500);
    if (rows.length === 0) return;

    runInTransaction(() => {
      for (const row of rows) applyPulledRow(table, row);
    });

    const maxUpdatedAt = rows.reduce((max, r) => {
      const u = r.updated_at as string;
      return !max || u > max ? u : max;
    }, since ?? '');
    syncMetaRepo.setLastPulledAt(table, maxUpdatedAt);
    since = maxUpdatedAt;

    if (rows.length < 500) return;
  }
}

function scheduleRetry(): void {
  // Engine tests assert on sync()'s outcome per call and never advance fake timers — a real
  // pending setTimeout here would outlive the test and hang the Jest worker on exit.
  if (schedulingDisabled) return;
  if (retryTimer) clearTimeout(retryTimer);
  const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
  retryAttempt += 1;
  retryTimer = setTimeout(() => sync(), delay);
}

/** One full push-then-pull cycle. Guarded so only one runs at a time; no-ops when offline or signed out. */
export async function sync(): Promise<void> {
  if (syncing) return;

  const tokens = await getTokens();
  if (!tokens) {
    useSyncStore.getState().setStatus('offline');
    return;
  }

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    useSyncStore.getState().setStatus('offline');
    return;
  }

  syncing = true;
  const store = useSyncStore.getState();
  const recovering = store.status === 'offline' || store.status === 'error';
  store.setStatus('syncing');

  try {
    const pushOk = await pushAll();
    for (const table of SYNCED_TABLES) await pullTable(table);

    refreshPendingCount();
    const remaining = syncQueueRepo.count();

    if (remaining === 0 && pushOk) {
      retryAttempt = 0;
      store.setSynced(new Date().toISOString());
      if (recovering) showToast({ message: i18n.t('sync.allSynced') });
    } else {
      store.setStatus('pending');
      if (!pushOk) scheduleRetry();
    }
  } catch {
    store.setError('sync.error');
    scheduleRetry();
  } finally {
    syncing = false;
  }
}

/**
 * Repository unit tests call create/update/softDelete directly and don't mock Keychain/NetInfo/fetch
 * (they're testing SQL, not sync) — scheduling a real sync() there would crash on the missing native
 * modules. The engine itself is covered by its own tests with those dependencies mocked.
 */
const schedulingDisabled = process.env.NODE_ENV === 'test';

/** Debounced trigger — call after every local write (2s per ARCHITECTURE.md §6). */
export function schedule(): void {
  refreshPendingCount();
  if (schedulingDisabled) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => sync(), DEBOUNCE_MS);
}

/** Call once at app start (after auth hydration) to wire the reconnect trigger and attempt an initial sync. */
export function start(): void {
  refreshPendingCount();
  if (schedulingDisabled) return;
  if (!netUnsubscribe) {
    netUnsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      if (online && wasOffline) {
        retryAttempt = 0;
        sync();
      }
      wasOffline = !online;
    });
  }
  sync();
}
