import { useMemo } from 'react';
import { getLocalUserId } from '../database/repositories/settingsRepo';

/** Pre-auth device user id (see settingsRepo.getLocalUserId). Stable for the app's lifetime. */
export function useLocalUserId(): string {
  return useMemo(() => getLocalUserId(), []);
}
