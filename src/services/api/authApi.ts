import { apiFetch, authedFetch } from './client';
import type { TokenPair } from '../auth/session';

export interface BackendProfile {
  id: string;
  googleSub: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  language: 'en' | 'hi';
  createdAt: string;
  updatedAt: string;
}

export async function signInWithGoogle(idToken: string): Promise<{ tokens: TokenPair; profile: BackendProfile }> {
  const result = await apiFetch<TokenPair & { profile: BackendProfile }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
  const { accessToken, refreshToken, profile } = result;
  return { tokens: { accessToken, refreshToken }, profile };
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  return apiFetch<TokenPair>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}

export async function me(): Promise<BackendProfile> {
  return authedFetch<BackendProfile>('/auth/me');
}

/** Permanently deletes the account. `idToken` is a fresh Firebase ID token — the backend's re-auth check. */
export async function deleteAccount(idToken: string): Promise<void> {
  await authedFetch<{ deleted: boolean }>('/auth/me', { method: 'DELETE', body: JSON.stringify({ idToken }) });
}
