/**
 * Premium entitlement. Billing (Play Billing products, restore, renewal date) lands in Milestone 9;
 * until then every user is on the free plan, so premium-only paths (PDF/Excel export) route to
 * the Premium screen and More shows the upgrade card.
 */
export interface Entitlement {
  isPremium: boolean;
  renewsOn: string | null;
}

export function useEntitlement(): Entitlement {
  return { isPremium: false, renewsOn: null };
}
