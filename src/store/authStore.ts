import { create } from 'zustand';
import * as settingsRepo from '../database/repositories/settingsRepo';
import type { StoredProfile } from '../database/repositories/settingsRepo';

interface AuthState {
  profile: StoredProfile | null;
  hydrated: boolean;
  signIn: (profile: StoredProfile) => void;
  signOut: () => void;
  /** Reads the persisted profile from SQLite. Must only run after migrate() — see SplashScreen. */
  hydrate: () => void;
}

/**
 * Milestone 4 stub: no real Google OAuth / Supabase session yet (no client IDs configured) — a
 * locally persisted profile stands in for "signed in". Milestone 5 swaps this for a real session.
 */
export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  hydrated: false,
  signIn: (profile) => {
    settingsRepo.setProfile(profile);
    set({ profile });
  },
  signOut: () => {
    settingsRepo.clearProfile();
    set({ profile: null });
  },
  hydrate: () => set({ profile: settingsRepo.getProfile(), hydrated: true }),
}));
