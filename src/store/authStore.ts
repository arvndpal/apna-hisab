import { create } from 'zustand';
import * as settingsRepo from '../database/repositories/settingsRepo';
import type { StoredProfile } from '../database/repositories/settingsRepo';
import { reassignLocalDataToProfile, wipeLocalData } from '../database/reassignUser';
import * as session from '../services/auth/session';
import type { TokenPair } from '../services/auth/session';
import type { BackendProfile } from '../services/api/authApi';
import { signOutGoogle } from '../services/auth/google';
import { useSyncStore } from './syncStore';

interface AuthState {
  profile: StoredProfile | null;
  hydrated: boolean;
  /** Persists the signed-in profile (local kv) and this backend's JWT pair (Keychain). */
  signIn: (profile: BackendProfile, tokens: TokenPair) => Promise<void>;
  signOut: () => Promise<void>;
  /** Reads the persisted profile from SQLite. Must only run after migrate() — see SplashScreen. */
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  hydrated: false,
  signIn: async (backendProfile, tokens) => {
    reassignLocalDataToProfile(settingsRepo.getLocalUserId(), backendProfile.id);
    const profile: StoredProfile = {
      id: backendProfile.id,
      name: backendProfile.name ?? '',
      email: backendProfile.email ?? '',
      avatarUrl: backendProfile.avatarUrl,
    };
    settingsRepo.setProfile(profile);
    await session.saveTokens(tokens);
    set({ profile });
  },
  signOut: async () => {
    const profile = settingsRepo.getProfile();
    if (profile) wipeLocalData(profile.id);
    settingsRepo.clearProfile();
    settingsRepo.clearLocalUserId();
    settingsRepo.clearLastUsedDefaults();
    settingsRepo.setLastSyncedAt(null);
    useSyncStore.setState({ lastSyncedAt: null, lastError: null });
    await session.clearTokens();
    await signOutGoogle();
    set({ profile: null });
  },
  hydrate: () => set({ profile: settingsRepo.getProfile(), hydrated: true }),
}));
