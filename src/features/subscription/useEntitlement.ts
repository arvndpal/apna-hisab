import { useEntitlementStore } from '../../store/entitlementStore';

export interface Entitlement {
  isPremium: boolean;
  /** The Play subscription product (premium_monthly / premium_yearly), when Premium. */
  productId: string | null;
}

/**
 * Premium entitlement (ARCHITECTURE.md §12): no ads, PDF/Excel export. Backed by the last purchase
 * Google Play confirmed (services/billing), cached locally so it holds offline.
 */
export function useEntitlement(): Entitlement {
  const entitlement = useEntitlementStore((s) => s.entitlement);
  return { isPremium: entitlement !== null, productId: entitlement?.productId ?? null };
}
