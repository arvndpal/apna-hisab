/**
 * Ad placement rules (ARCHITECTURE.md §11, CLAUDE.md non-negotiables). Pure so they're unit-tested;
 * ads.ts feeds in the live state.
 */
export type AdPlacement = 'transactions_list_end' | 'reports_below_charts' | 'interstitial_leave_reports';

/** Screens that never show an ad (or sit under one): onboarding, lock, entry forms, Premium, Export, Delete account. */
export const AD_DENYLIST_ROUTES = new Set([
  'Splash',
  'Auth',
  'Welcome',
  'Login',
  'LanguageSelect',
  'AppLockSetup',
  'PinCreate',
  'LockScreen',
  'AddTransaction',
  'Premium',
  'Export',
  'DeleteAccount',
]);

const DAY_MS = 24 * 60 * 60 * 1000;
export const INTERSTITIAL_MIN_INSTALL_AGE_MS = 3 * DAY_MS;
export const INTERSTITIAL_MIN_MS_AFTER_SAVE = 60_000;
export const INTERSTITIALS_PER_SESSION = 1;

export interface AdContext {
  isPremium: boolean;
  /** The route the ad would appear over/after. Undefined = unknown, treated as allowed for inline slots. */
  route?: string;
  /** A sheet or dialog is open on top. */
  overlayOpen?: boolean;
  now: number;
  installedAt: number;
  /** Last time the user saved a transaction or Udhaar entry this session. */
  lastSaveAt: number | null;
  interstitialsShown: number;
}

export function canShowAd(placement: AdPlacement, ctx: AdContext): boolean {
  if (ctx.isPremium || ctx.overlayOpen) return false;
  if (ctx.route && AD_DENYLIST_ROUTES.has(ctx.route)) return false;
  if (placement !== 'interstitial_leave_reports') return true;

  if (ctx.interstitialsShown >= INTERSTITIALS_PER_SESSION) return false;
  if (ctx.now - ctx.installedAt < INTERSTITIAL_MIN_INSTALL_AGE_MS) return false;
  if (ctx.lastSaveAt !== null && ctx.now - ctx.lastSaveAt < INTERSTITIAL_MIN_MS_AFTER_SAVE) return false;
  return true;
}
