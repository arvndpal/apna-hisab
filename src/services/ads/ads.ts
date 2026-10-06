/**
 * Runtime side of the ad rules (adRules.ts): ad unit ids, per-session counters and the "just saved"
 * clock. Debug builds always use Google's test units; a release build without unit ids shows no ads.
 */
import MobileAds, { TestIds } from 'react-native-google-mobile-ads';
import { ADMOB_INTERSTITIAL_UNIT_ID, ADMOB_NATIVE_UNIT_ID } from '@env';
import * as settingsRepo from '../../database/repositories/settingsRepo';
import { currentRouteName } from '../../app/navigation/navigationRef';
import { canShowAd, type AdPlacement } from './adRules';

export const NATIVE_AD_UNIT_ID: string | null = __DEV__ ? TestIds.NATIVE : ADMOB_NATIVE_UNIT_ID || null;
export const INTERSTITIAL_AD_UNIT_ID: string | null = __DEV__ ? TestIds.INTERSTITIAL : ADMOB_INTERSTITIAL_UNIT_ID || null;

let lastSaveAt: number | null = null;
let interstitialsShown = 0;
let initialized = false;

/** Call after every user save (transaction, Udhaar): no interstitial may follow within 60 s. */
export function noteSave(): void {
  lastSaveAt = Date.now();
}

export function noteInterstitialShown(): void {
  interstitialsShown += 1;
}

/** Starts the Mobile Ads SDK once, in the background. Free users only — Premium never loads an ad. */
export function initAds(): void {
  if (initialized) return;
  initialized = true;
  MobileAds()
    .initialize()
    .catch(() => {
      initialized = false;
    });
}

/** Live check against the current route and session state. */
export function adAllowed(placement: AdPlacement, isPremium: boolean, route: string | undefined = currentRouteName()): boolean {
  return canShowAd(placement, {
    isPremium,
    route,
    now: Date.now(),
    installedAt: settingsRepo.getInstalledAt(),
    lastSaveAt,
    interstitialsShown,
  });
}

/** Test-only reset of the per-session counters. */
export function __resetAdSession(): void {
  lastSaveAt = null;
  interstitialsShown = 0;
}
