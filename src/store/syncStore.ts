import { create } from 'zustand';
import * as settingsRepo from '../database/repositories/settingsRepo';
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
  /** Reads the persisted last-sync time. Must only run after migrate() — see SplashScreen. */
  hydrate: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'pending',
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setSynced: (atIso) => {
    settingsRepo.setLastSyncedAt(atIso);
    set({ status: 'synced', lastSyncedAt: atIso, lastError: null });
  },
  setError: (lastError) => set({ status: 'error', lastError }),
  hydrate: () => set({ lastSyncedAt: settingsRepo.getLastSyncedAt() }),
}));
