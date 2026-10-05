import { useSyncStore } from '../store/syncStore';
import type { SyncUiStatus } from '../types/models';

/** Real sync status from the sync engine (src/sync/syncEngine) — Milestone 5. */
export function useSyncStatus(): { status: SyncUiStatus; pendingCount: number; lastSyncedAt: string | null; lastError: string | null } {
  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const lastError = useSyncStore((s) => s.lastError);
  return { status, pendingCount, lastSyncedAt, lastError };
}
