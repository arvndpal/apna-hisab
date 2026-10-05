/** This backend's own JWT pair (never Supabase's — see docs/ARCHITECTURE.md §0/§9), Keychain-backed. */
import * as Keychain from 'react-native-keychain';

const SESSION_SERVICE = 'apnahisab.session';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: TokenPair): Promise<void> {
  await Keychain.setGenericPassword('tokens', JSON.stringify(tokens), { service: SESSION_SERVICE });
}

export async function getTokens(): Promise<TokenPair | null> {
  const result = await Keychain.getGenericPassword({ service: SESSION_SERVICE });
  if (result === false) return null;
  try {
    return JSON.parse(result.password) as TokenPair;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SESSION_SERVICE });
}
