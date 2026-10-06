import { shouldLockOnResume } from './resumeLock';

const base = { lockMethod: 'pin' as const, lockAfterMs: 60_000, backgroundedAt: 1_000, now: 61_000, currentRootRoute: 'App' };

describe('shouldLockOnResume', () => {
  it('locks once the app was away for at least lockAfter', () => {
    expect(shouldLockOnResume(base)).toBe(true);
    expect(shouldLockOnResume({ ...base, now: 60_999 })).toBe(false);
  });

  it('locks on every return when set to Immediately', () => {
    expect(shouldLockOnResume({ ...base, lockAfterMs: 0, now: 1_000 })).toBe(true);
  });

  it('never locks when the lock is off or the app was never backgrounded', () => {
    expect(shouldLockOnResume({ ...base, lockMethod: 'none' })).toBe(false);
    expect(shouldLockOnResume({ ...base, backgroundedAt: null })).toBe(false);
  });

  it('only locks over the signed-in app, not Splash, Auth or an existing LockScreen', () => {
    for (const route of ['Splash', 'Auth', 'LockScreen', undefined]) {
      expect(shouldLockOnResume({ ...base, currentRootRoute: route })).toBe(false);
    }
  });
});
