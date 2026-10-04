import { useLiveQuery } from './useLiveQuery';
import * as syncQueueRepo from '../database/repositories/syncQueueRepo';
import type { SyncUiStatus } from '../types/models';

/**
 * Milestone 3 stand-in: no network/push yet (Milestone 5), so status is derived purely from the
 * local queue — 'pending' while rows are queued, 'synced' once it's empty.
 */
export function useSyncStatus(): { status: SyncUiStatus; pendingCount: number } {
  const pendingCount = useLiveQuery(['transactions', 'categories', 'udhaar_people', 'udhaar_entries'], () => syncQueueRepo.count(), []);
  return { status: pendingCount > 0 ? 'pending' : 'synced', pendingCount };
}
