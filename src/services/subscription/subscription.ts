/**
 * The server-tracked side of Premium (docs/ARCHITECTURE.md §12): a free trial a new user explicitly
 * claims during the login flow (see ClaimTrialScreen), plus whatever plan the purchase flow records
 * (currently a mock payment — see PremiumScreen). Kept separate from services/billing/billing.ts,
 * which is purely the real Google Play Billing integration and its own local-only entitlement cache.
 */
import * as subscriptionApi from '../api/subscriptionApi';
import { useEntitlementStore } from '../../store/entitlementStore';
import type { StoredSubscription } from '../../database/repositories/settingsRepo';

function cache(status: subscriptionApi.SubscriptionStatus): StoredSubscription {
  const subscription: StoredSubscription = {
    plan: status.plan,
    isPremium: status.isPremium,
    endsAt: status.endsAt,
    trialDays: status.trialDays,
  };
  useEntitlementStore.getState().setSubscription(subscription);
  return subscription;
}

/** Call after sign-in (see SplashScreen, LoginScreen) — fire-and-forget, never await on a user action. */
export async function refreshSubscription(): Promise<StoredSubscription> {
  try {
    return cache(await subscriptionApi.getStatus());
  } catch {
    // Offline or backend unreachable — keep whatever was last cached locally.
    return useEntitlementStore.getState().subscription ?? { plan: null, isPremium: false, endsAt: null, trialDays: 30 };
  }
}

/** Claims the free trial — see ClaimTrialScreen, shown to a new user during the login flow. */
export async function claimFreeTrial(): Promise<StoredSubscription> {
  return cache(await subscriptionApi.claimTrial());
}

/** Call once the purchase UI confirms a plan (see PremiumScreen's handleConfirmPayment). */
export async function recordPlanPurchase(plan: 'monthly' | 'yearly', productId: string): Promise<void> {
  cache(await subscriptionApi.recordPurchase(plan, productId));
}
