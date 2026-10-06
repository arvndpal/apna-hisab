/**
 * Pure helpers for Play Billing data (react-native-iap shapes, narrowed to the fields we read) —
 * kept apart from billing.ts so they're unit-testable without the native module.
 */
import { PLAY_PRODUCT_ID_PREMIUM_MONTHLY, PLAY_PRODUCT_ID_PREMIUM_YEARLY } from '@env';

export type PlanKey = 'yearly' | 'monthly';

export const PRODUCT_IDS: Record<PlanKey, string> = {
  yearly: PLAY_PRODUCT_ID_PREMIUM_YEARLY || 'premium_yearly',
  monthly: PLAY_PRODUCT_ID_PREMIUM_MONTHLY || 'premium_monthly',
};

export interface Plan {
  key: PlanKey;
  productId: string;
  /** Localized by Play, e.g. "₹499.00". */
  displayPrice: string;
  /** Android base-plan offer token, required to start the purchase. */
  offerToken: string | null;
}

interface ProductLike {
  id: string;
  displayPrice: string;
  subscriptionOffers?: Array<{ offerTokenAndroid?: string | null; offerTagsAndroid?: string[] | null; displayPrice: string }> | null;
}

/**
 * One plan per product we sell. Uses the plain base-plan offer (no offer tags = no intro deal) so the
 * price shown is the price charged — the Premium screen promises no pre-selected extras.
 */
export function toPlans(products: ProductLike[]): Partial<Record<PlanKey, Plan>> {
  const plans: Partial<Record<PlanKey, Plan>> = {};
  for (const key of ['yearly', 'monthly'] as const) {
    const product = products.find((p) => p.id === PRODUCT_IDS[key]);
    if (!product) continue;
    const offers = product.subscriptionOffers ?? [];
    const base = offers.find((o) => o.offerTokenAndroid && !o.offerTagsAndroid?.length) ?? offers.find((o) => o.offerTokenAndroid);
    plans[key] = { key, productId: product.id, displayPrice: base?.displayPrice || product.displayPrice, offerToken: base?.offerTokenAndroid ?? null };
  }
  return plans;
}

export interface PurchaseLike {
  productId: string;
  purchaseState: 'pending' | 'purchased' | 'unknown';
  transactionDate: number;
  isSuspendedAndroid?: boolean | null;
}

/** The newest live Premium subscription among the user's purchases, if any. Suspended (failed payment) doesn't count. */
export function findActivePremium<T extends PurchaseLike>(purchases: T[]): T | null {
  const ours = new Set(Object.values(PRODUCT_IDS));
  return (
    purchases
      .filter((p) => ours.has(p.productId) && p.purchaseState === 'purchased' && !p.isSuspendedAndroid)
      .sort((a, b) => b.transactionDate - a.transactionDate)[0] ?? null
  );
}

export function planKeyFor(productId: string | null): PlanKey | null {
  if (productId === PRODUCT_IDS.yearly) return 'yearly';
  if (productId === PRODUCT_IDS.monthly) return 'monthly';
  return null;
}
