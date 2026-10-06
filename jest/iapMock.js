// Jest-only stand-in for react-native-iap (Nitro native module): Play Billing is never reachable.
const unavailable = () => Promise.reject(new Error('billing unavailable in tests'));

module.exports = {
  ErrorCode: { UserCancelled: 'user-cancelled' },
  initConnection: unavailable,
  fetchProducts: unavailable,
  getAvailablePurchases: unavailable,
  requestPurchase: unavailable,
  finishTransaction: unavailable,
  deepLinkToSubscriptions: unavailable,
  purchaseUpdatedListener: () => ({ remove: () => {} }),
  purchaseErrorListener: () => ({ remove: () => {} }),
};
