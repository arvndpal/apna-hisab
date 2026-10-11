// Jest-only stand-in for @notifee/react-native — the real native module isn't reachable in the
// test environment, and importing it unmocked crashes on "Notifee native module not found".
module.exports = {
  __esModule: true,
  default: {
    createChannel: () => Promise.resolve('channel-id'),
    requestPermission: () => Promise.resolve({ authorizationStatus: 1 }),
    displayNotification: () => Promise.resolve('notification-id'),
    cancelTriggerNotification: () => Promise.resolve(),
    cancelNotification: () => Promise.resolve(),
    createTriggerNotification: () => Promise.resolve('notification-id'),
    onForegroundEvent: () => () => {},
    onBackgroundEvent: () => {},
  },
  AndroidImportance: { HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
  EventType: { DISMISSED: 0, PRESS: 1, ACTION_PRESS: 2, DELIVERED: 3 },
  TriggerType: { TIMESTAMP: 0, INTERVAL: 1 },
  RepeatFrequency: { NONE: -1, HOURLY: 0, DAILY: 1, WEEKLY: 2 },
};
