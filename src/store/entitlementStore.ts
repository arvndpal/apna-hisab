import { create } from 'zustand';
import * as settingsRepo from '../database/repositories/settingsRepo';
import type { StoredEntitlement } from '../database/repositories/settingsRepo';

interface EntitlementState {
  entitlement: StoredEntitlement | null;
  /** Grants Premium (after Play confirms a purchase, or a restore finds one). Persisted for offline use. */
  grant: (entitlement: StoredEntitlement) => void;
  /** Play reported no active subscription (expired, cancelled, refunded). */
  revoke: () => void;
  /** Reads the cached entitlement. Must only run after migrate() — see SplashScreen. */
  hydrate: () => void;
}

export const useEntitlementStore = create<EntitlementState>((set) => ({
  entitlement: null,
  grant: (entitlement) => {
    settingsRepo.setEntitlement(entitlement);
    set({ entitlement });
  },
  revoke: () => {
    settingsRepo.setEntitlement(null);
    set({ entitlement: null });
  },
  hydrate: () => set({ entitlement: settingsRepo.getEntitlement() }),
}));
