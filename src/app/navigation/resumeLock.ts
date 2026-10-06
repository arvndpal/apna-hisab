import type { LockMethod } from '../../database/repositories/settingsRepo';

/**
 * App lock on return (SCREENS.md §5b "cold start / resume after lockAfter"): lock when the app
 * comes back to the foreground after being away at least `lockAfterMs`, but only from the signed-in
 * App stack — Splash/Auth/LockScreen are already gates of their own.
 */
export function shouldLockOnResume(params: {
  lockMethod: LockMethod;
  lockAfterMs: number;
  backgroundedAt: number | null;
  now: number;
  currentRootRoute: string | undefined;
}): boolean {
  const { lockMethod, lockAfterMs, backgroundedAt, now, currentRootRoute } = params;
  if (lockMethod === 'none' || backgroundedAt === null) return false;
  if (currentRootRoute !== 'App') return false;
  return now - backgroundedAt >= lockAfterMs;
}
