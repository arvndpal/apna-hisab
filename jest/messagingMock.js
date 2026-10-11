// Jest-only stand-in for @react-native-firebase/messaging — the real native module isn't reachable
// in the test environment, and importing it unmocked crashes on "Native module ... not registered".
module.exports = {
  getMessaging: () => ({}),
  getToken: () => Promise.resolve('test-fcm-token'),
  deleteToken: () => Promise.resolve(),
  onMessage: () => () => {},
  onNotificationOpenedApp: () => () => {},
  onTokenRefresh: () => () => {},
  getInitialNotification: () => Promise.resolve(null),
  setBackgroundMessageHandler: () => {},
  requestPermission: () => Promise.resolve(1),
  hasPermission: () => Promise.resolve(1),
  AuthorizationStatus: { AUTHORIZED: 1, DENIED: 0, NOT_DETERMINED: -1, PROVISIONAL: 2 },
};
