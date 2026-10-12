import { useEntitlementStore } from '../../store/entitlementStore';

export interface Entitlement {
  isPremium: boolean;
  /** The Play subscription product (premium_monthly / premium_yearly), when Premium. */
  productId: string | null;
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
  };
}
