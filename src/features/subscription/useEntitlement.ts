import { useEntitlementStore } from '../../store/entitlementStore';

export interface Entitlement {
  isPremium: boolean;
  /** The Play subscription product (premium_monthly / premium_yearly), when Premium. */
  productId: string | null;
  /**
   * When the current Premium period ends (ISO string), from the server-tracked subscription/trial.
   * Null when there's nothing server-tracked yet (e.g. Play just confirmed a purchase a moment ago
   * and recordPlanPurchase's fire-and-forget sync hasn't landed) — Play purchases carry no locally
   * known expiry of their own.
   */
  endsAt: string | null;
}

/**
 * Premium entitlement (ARCHITECTURE.md §12): no ads, PDF/Excel export. True from either the last
 * purchase Google Play confirmed (services/billing) or the server-tracked subscription/free trial
 * (services/subscription) — either one is enough, and both are cached locally so this holds offline.
 */
export function useEntitlement(): Entitlement {
  const entitlement = useEntitlementStore((s) => s.entitlement);
  const subscription = useEntitlementStore((s) => s.subscription);
  return {
    isPremium: entitlement !== null || subscription?.isPremium === true,
    productId: entitlement?.productId ?? null,
    endsAt: subscription?.endsAt ?? null,
  };
}
