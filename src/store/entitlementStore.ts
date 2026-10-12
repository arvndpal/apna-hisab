import { create } from 'zustand';
import * as settingsRepo from '../database/repositories/settingsRepo';
import type { StoredEntitlement, StoredSubscription } from '../database/repositories/settingsRepo';

interface EntitlementState {
  entitlement: StoredEntitlement | null;
  subscription: StoredSubscription | null;
  /** Grants Premium (after Play confirms a purchase, or a restore finds one). Persisted for offline use. */
  grant: (entitlement: StoredEntitlement) => void;
  /** Play reported no active subscription (expired, cancelled, refunded). */
  revoke: () => void;
  /** Caches the backend's current subscription/trial status — see services/subscription.ts. */
  setSubscription: (subscription: StoredSubscription | null) => void;
  /** Reads the cached entitlement and subscription. Must only run after migrate() — see SplashScreen. */
  hydrate: () => void;
}

export const useEntitlementStore = create<EntitlementState>((set) => ({
  entitlement: null,
  subscription: null,
  grant: (entitlement) => {
    settingsRepo.setEntitlement(entitlement);
    set({ entitlement });
  },
  revoke: () => {
    settingsRepo.setEntitlement(null);
    set({ entitlement: null });
  },
  setSubscription: (subscription) => {
    settingsRepo.setSubscription(subscription);
    set({ subscription });
  },
  hydrate: () => set({ entitlement: settingsRepo.getEntitlement(), subscription: settingsRepo.getSubscription() }),
}));
