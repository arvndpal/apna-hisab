import { findActivePremium, planKeyFor, toPlans } from './plans';

describe('toPlans', () => {
  it('maps both products, preferring the base-plan offer over a tagged intro offer', () => {
    const plans = toPlans([
      {
        id: 'premium_yearly',
        displayPrice: '₹499.00',
        subscriptionOffers: [
          { offerTokenAndroid: 'intro', offerTagsAndroid: ['intro'], displayPrice: '₹99.00' },
          { offerTokenAndroid: 'base', offerTagsAndroid: [], displayPrice: '₹499.00' },
        ],
      },
      { id: 'premium_monthly', displayPrice: '₹59.00', subscriptionOffers: [{ offerTokenAndroid: 'm', displayPrice: '₹59.00' }] },
      { id: 'something_else', displayPrice: '₹1.00' },
    ]);
    expect(plans.yearly).toEqual({ key: 'yearly', productId: 'premium_yearly', displayPrice: '₹499.00', offerToken: 'base' });
    expect(plans.monthly?.offerToken).toBe('m');
  });

  it('leaves a plan out when Play did not return it', () => {
    expect(toPlans([{ id: 'premium_monthly', displayPrice: '₹59.00' }])).toEqual({
      monthly: { key: 'monthly', productId: 'premium_monthly', displayPrice: '₹59.00', offerToken: null },
    });
  });
});

describe('findActivePremium', () => {
  const p = (productId: string, purchaseState: 'pending' | 'purchased', transactionDate: number, isSuspendedAndroid = false) => ({
    productId,
    purchaseState,
    transactionDate,
    isSuspendedAndroid,
  });

  it('picks the newest purchased Premium subscription', () => {
    const found = findActivePremium([p('premium_monthly', 'purchased', 1), p('premium_yearly', 'purchased', 5), p('other', 'purchased', 9)]);
    expect(found?.productId).toBe('premium_yearly');
  });

  it('ignores pending and suspended subscriptions', () => {
    expect(findActivePremium([p('premium_yearly', 'pending', 5), p('premium_monthly', 'purchased', 3, true)])).toBeNull();
    expect(findActivePremium([])).toBeNull();
  });
});

describe('planKeyFor', () => {
  it('maps product ids back to plans', () => {
    expect(planKeyFor('premium_yearly')).toBe('yearly');
    expect(planKeyFor('premium_monthly')).toBe('monthly');
    expect(planKeyFor(null)).toBeNull();
  });
});
