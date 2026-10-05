import { useMemo } from 'react';
import { getActiveUserId } from '../database/repositories/settingsRepo';

/** The signed-in profile's id once signed in, else the pre-auth local device id. Stable for the component's lifetime. */
export function useActiveUserId(): string {
  return useMemo(() => getActiveUserId(), []);
}
