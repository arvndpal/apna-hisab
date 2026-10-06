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

/** How long a suppression stays valid if the app never actually leaves (e.g. the sheet failed to open). */
const SUPPRESSION_WINDOW_MS = 2 * 60_000;
let suppressedAt: number | null = null;

/**
 * Call right before the app itself opens another activity — the share sheet, Play's purchase sheet,
 * a full-screen ad, Google's account picker. Android reports those as the app going to the
 * background; without this, "Lock after: Immediately" would demand the PIN on the way back.
 */
export function suppressNextResumeLock(now: number = Date.now()): void {
  suppressedAt = now;
}

/** Reads and clears the flag (App.tsx, on returning to the foreground). Stale flags don't count. */
export function consumeResumeLockSuppression(now: number = Date.now()): boolean {
  const skip = suppressedAt !== null && now - suppressedAt <= SUPPRESSION_WINDOW_MS;
  suppressedAt = null;
  return skip;
}
