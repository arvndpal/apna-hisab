import { create } from 'zustand';
import type { SyncUiStatus } from '../types/models';

interface SyncState {
  status: SyncUiStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  /** Plain-language i18n key, never a raw error — see docs/SCREENS.md §22. */
  lastError: string | null;
  setStatus: (status: SyncUiStatus) => void;
  setPendingCount: (count: number) => void;
  setSynced: (atIso: string) => void;
  setError: (errorKey: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'pending',
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setSynced: (atIso) => set({ status: 'synced', lastSyncedAt: atIso, lastError: null }),
  setError: (lastError) => set({ status: 'error', lastError }),
}));
