module.exports = {
  fetch: () => Promise.resolve({ isConnected: true, isInternetReachable: true }),
  addEventListener: () => () => {},
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
};
