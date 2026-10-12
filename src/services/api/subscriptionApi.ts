import { authedFetch } from './client';

export interface SubscriptionStatus {
  /** null until this account has either claimed the trial or bought a plan. */
  plan: 'trial' | 'monthly' | 'yearly' | null;
  isPremium: boolean;
  endsAt: string | null;
  productId: string | null;
  /** How long the free trial is right now (backend-configured — see TRIAL_DAYS), for the claim offer's copy. */
  trialDays: number;
}

export function getStatus(): Promise<SubscriptionStatus> {
  return authedFetch('/subscriptions/me');
}

/** Starts this profile's free trial — see the login flow's claim-trial step. A no-op if already claimed. */
export function claimTrial(): Promise<SubscriptionStatus> {
  return authedFetch('/subscriptions/claim-trial', { method: 'POST' });
}

/** Persists the plan the (currently mock) purchase flow just confirmed — see PremiumScreen. */
export function recordPurchase(plan: 'monthly' | 'yearly', productId: string): Promise<SubscriptionStatus> {
  return authedFetch('/subscriptions/purchase', { method: 'POST', body: JSON.stringify({ plan, productId }) });
}
