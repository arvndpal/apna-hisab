import { __setTestDriver } from '../../database/sqlite/client';
import { createTestDriver } from '../../database/sqlite/testDriver';
import { migrate } from '../../database/migrations';
import * as settingsRepo from '../../database/repositories/settingsRepo';
import { useEntitlementStore } from '../../store/entitlementStore';

const mockIap = {
  listener: null as null | ((p: unknown) => Promise<void> | void),
  errorListener: null as null | ((e: { code: string }) => void),
  initConnection: jest.fn(() => Promise.resolve(true)),
  getAvailablePurchases: jest.fn(() => Promise.resolve([] as unknown[])),
  finishTransaction: jest.fn((_args?: unknown) => Promise.resolve()),
  fetchProducts: jest.fn((_args?: unknown) => Promise.resolve([] as unknown[])),
  requestPurchase: jest.fn((_args?: unknown) => Promise.resolve(null)),
};

jest.mock('react-native-iap', () => ({
  ErrorCode: { UserCancelled: 'user-cancelled' },
  initConnection: () => mockIap.initConnection(),
  getAvailablePurchases: () => mockIap.getAvailablePurchases(),
  finishTransaction: (args: unknown) => mockIap.finishTransaction(args),
  fetchProducts: (args: unknown) => mockIap.fetchProducts(args),
  requestPurchase: (args: unknown) => mockIap.requestPurchase(args),
  deepLinkToSubscriptions: () => Promise.resolve(),
  purchaseUpdatedListener: (fn: (p: unknown) => void) => {
    mockIap.listener = fn;
    return { remove: () => {} };
  },
  purchaseErrorListener: (fn: (e: { code: string }) => void) => {
    mockIap.errorListener = fn;
    return { remove: () => {} };
  },
}));

import { buy, loadPlans, refreshEntitlement, startBilling, useBillingStore } from './billing';

const purchase = (overrides: Record<string, unknown> = {}) => ({
  productId: 'premium_yearly',
  purchaseState: 'purchased',
  transactionDate: 1_700_000_000_000,
  isAcknowledgedAndroid: true,
  ...overrides,
});

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
  useEntitlementStore.setState({ entitlement: null });
  useBillingStore.setState({ status: 'idle' });
  jest.clearAllMocks();
});

afterAll(() => __setTestDriver(null));

describe('billing', () => {
  it('grants and persists Premium when Play reports an active subscription', async () => {
    mockIap.getAvailablePurchases.mockResolvedValueOnce([purchase()]);
    await startBilling();
    expect(useEntitlementStore.getState().entitlement?.productId).toBe('premium_yearly');
    expect(settingsRepo.getEntitlement()?.productId).toBe('premium_yearly');
  });

  it('acknowledges a purchase that was never finished, then grants', async () => {
    mockIap.getAvailablePurchases.mockResolvedValueOnce([purchase({ isAcknowledgedAndroid: false })]);
    expect(await refreshEntitlement()).toBe(true);
    expect(mockIap.finishTransaction).toHaveBeenCalledWith(expect.objectContaining({ isConsumable: false }));
  });

  it('revokes Premium once Play no longer lists the subscription', async () => {
    useEntitlementStore.getState().grant({ productId: 'premium_monthly', purchasedAt: 1 });
    mockIap.getAvailablePurchases.mockResolvedValueOnce([]);
    expect(await refreshEntitlement()).toBe(false);
    expect(useEntitlementStore.getState().entitlement).toBeNull();
  });

  it('keeps the cached entitlement when Play cannot be reached', async () => {
    useEntitlementStore.getState().grant({ productId: 'premium_monthly', purchasedAt: 1 });
    mockIap.getAvailablePurchases.mockRejectedValueOnce(new Error('offline'));
    expect(await refreshEntitlement()).toBeNull();
    expect(useEntitlementStore.getState().entitlement?.productId).toBe('premium_monthly');
  });

  it('completes a purchase from the listener: acknowledge, grant, success', async () => {
    await startBilling();
    await mockIap.listener?.(purchase({ productId: 'premium_monthly' }));
    expect(mockIap.finishTransaction).toHaveBeenCalled();
    expect(useEntitlementStore.getState().entitlement?.productId).toBe('premium_monthly');
    expect(useBillingStore.getState().status).toBe('success');
  });

  it('marks a pending payment without granting Premium', async () => {
    await startBilling();
    await mockIap.listener?.(purchase({ purchaseState: 'pending' }));
    expect(useBillingStore.getState().status).toBe('pending');
    expect(useEntitlementStore.getState().entitlement).toBeNull();
  });

  it('treats a cancelled purchase as no error', async () => {
    await startBilling();
    useBillingStore.setState({ status: 'purchasing' });
    mockIap.errorListener?.({ code: 'user-cancelled' });
    expect(useBillingStore.getState().status).toBe('idle');
    mockIap.errorListener?.({ code: 'service-error' });
    expect(useBillingStore.getState().status).toBe('error');
  });

  it('requests the subscription with its base-plan offer token', async () => {
    mockIap.fetchProducts.mockResolvedValueOnce([
      { id: 'premium_yearly', displayPrice: '₹499.00', subscriptionOffers: [{ offerTokenAndroid: 'tok', displayPrice: '₹499.00' }] },
    ]);
    const plans = await loadPlans();
    await buy(plans.yearly!);
    expect(mockIap.requestPurchase).toHaveBeenCalledWith({
      type: 'subs',
      request: { google: { skus: ['premium_yearly'], subscriptionOffers: [{ sku: 'premium_yearly', offerToken: 'tok' }] } },
    });
    expect(useBillingStore.getState().status).toBe('purchasing');
  });
});
