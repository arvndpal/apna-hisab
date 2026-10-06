import { consumeResumeLockSuppression, shouldLockOnResume, suppressNextResumeLock } from './resumeLock';

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

describe('suppressNextResumeLock', () => {
  it('skips exactly one resume', () => {
    expect(consumeResumeLockSuppression()).toBe(false);
    suppressNextResumeLock();
    expect(consumeResumeLockSuppression()).toBe(true);
    expect(consumeResumeLockSuppression()).toBe(false);
  });
});

it('ignores a suppression the app never used within two minutes', () => {
  suppressNextResumeLock(0);
  expect(consumeResumeLockSuppression(2 * 60_000 + 1)).toBe(false);
});
