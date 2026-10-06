/**
 * Google Play Billing for Premium (ARCHITECTURE.md §12) via react-native-iap. The entitlement lives
 * in entitlementStore (cached locally, so Premium holds offline); this module keeps it in step with
 * what Play reports and drives the Premium screen's purchase states through billingStore.
 *
 * Purchases are verified by Play on the device only — there is no server-side receipt check yet.
 */
import {
  deepLinkToSubscriptions,
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'react-native-iap';
import { create } from 'zustand';
import { useEntitlementStore } from '../../store/entitlementStore';
import { findActivePremium, PRODUCT_IDS, toPlans, type Plan, type PlanKey } from './plans';
import { suppressNextResumeLock } from '../../app/navigation/resumeLock';

export type PurchaseStatus = 'idle' | 'purchasing' | 'pending' | 'success' | 'error';

interface BillingState {
  status: PurchaseStatus;
  setStatus: (status: PurchaseStatus) => void;
}

export const useBillingStore = create<BillingState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));

const ANDROID_PACKAGE = 'com.apnahisab.app';
const OUR_PRODUCTS = new Set(Object.values(PRODUCT_IDS));

let connecting: Promise<boolean> | null = null;
let listening = false;

/** Connects once; resolves false if Play Billing isn't available (no Play Store, offline first start). */
function connect(): Promise<boolean> {
  connecting ??= initConnection()
    .then(() => true)
    .catch(() => {
      connecting = null; // allow a later retry
      return false;
    });
  return connecting;
}

/** Acknowledges the purchase with Play (unacknowledged subscriptions are refunded after 3 days) and grants Premium. */
async function completePurchase(purchase: Purchase): Promise<void> {
  await finishTransaction({ purchase, isConsumable: false });
  useEntitlementStore.getState().grant({ productId: purchase.productId, purchasedAt: purchase.transactionDate });
}

function listen(): void {
  if (listening) return;
  listening = true;

  purchaseUpdatedListener(async (purchase) => {
    if (!OUR_PRODUCTS.has(purchase.productId)) return;
    const { setStatus } = useBillingStore.getState();
    if (purchase.purchaseState === 'pending') {
      setStatus('pending');
      return;
    }
    if (purchase.purchaseState !== 'purchased') return;
    try {
      await completePurchase(purchase);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  });

  purchaseErrorListener((error) => {
    useBillingStore.getState().setStatus(error.code === ErrorCode.UserCancelled ? 'idle' : 'error');
  });
}

/** App start: connect, listen for purchase updates, and re-check the entitlement with Play. Never throws. */
export async function startBilling(): Promise<void> {
  if (!(await connect())) return;
  listen();
  await refreshEntitlement();
}

/**
 * Asks Play which subscriptions are live and updates the entitlement. Returns whether Premium is
 * active, or null when Play couldn't be reached (the cached entitlement is left alone then).
 */
export async function refreshEntitlement(): Promise<boolean | null> {
  if (!(await connect())) return null;
  let purchases: Purchase[];
  try {
    purchases = await getAvailablePurchases();
  } catch {
    return null;
  }

  const active = findActivePremium(purchases);
  if (!active) {
    useEntitlementStore.getState().revoke();
    return false;
  }
  try {
    // A purchase made while the app was killed may never have been acknowledged.
    if ('isAcknowledgedAndroid' in active && active.isAcknowledgedAndroid === false) await completePurchase(active);
    else useEntitlementStore.getState().grant({ productId: active.productId, purchasedAt: active.transactionDate });
  } catch {
    return null;
  }
  return true;
}

/** Localized prices for the Premium screen. Empty when Play is unreachable or the products don't exist yet. */
export async function loadPlans(): Promise<Partial<Record<PlanKey, Plan>>> {
  if (!(await connect())) return {};
  listen();
  try {
    const products = await fetchProducts({ skus: Object.values(PRODUCT_IDS), type: 'subs' });
    return toPlans((products ?? []) as Parameters<typeof toPlans>[0]);
  } catch {
    return {};
  }
}

/** Opens Play's purchase sheet. The outcome arrives via the listeners above, reflected in billingStore.status. */
export async function buy(plan: Plan): Promise<void> {
  const { setStatus } = useBillingStore.getState();
  setStatus('purchasing');
  suppressNextResumeLock();
  try {
    await requestPurchase({
      type: 'subs',
      request: {
        google: {
          skus: [plan.productId],
          subscriptionOffers: plan.offerToken ? [{ sku: plan.productId, offerToken: plan.offerToken }] : undefined,
        },
      },
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    setStatus(code === ErrorCode.UserCancelled ? 'idle' : 'error');
  }
}

/** Play's own subscription page (change plan, cancel, fix payment). */
export async function manageSubscription(productId: string | null): Promise<void> {
  suppressNextResumeLock();
  try {
    await deepLinkToSubscriptions({ skuAndroid: productId, packageNameAndroid: ANDROID_PACKAGE });
  } catch {
    // Play Store missing — nothing more to do from the app.
  }
}
