import { Platform } from 'react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  getInitialNotification,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { navigationRef } from '../../app/navigation/navigationRef';
import * as notificationsApi from '../api/notificationsApi';

const CHANNEL_ID = 'push';
let listenersRegistered = false;

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({ id: CHANNEL_ID, name: 'Notifications', importance: AndroidImportance.DEFAULT });
}

/** Routes a tapped notification's data payload to the right screen. Unknown/missing type → Home. */
function handleNotificationOpen(data: Record<string, string> | undefined): void {
  if (!navigationRef.isReady()) return;
  switch (data?.type) {
    default:
      navigationRef.navigate('App', { screen: 'MainTabs', params: { screen: 'Home' } });
  }
}

async function displayMessage(message: RemoteMessage): Promise<void> {
  const title = message.notification?.title ?? message.data?.title;
  const body = message.notification?.body ?? message.data?.body;
  if (!title && !body) return;
  await ensureChannel();
  await notifee.displayNotification({
    title: typeof title === 'string' ? title : undefined,
    body: typeof body === 'string' ? body : undefined,
    data: message.data,
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: 'default' },
      // Matches the FCM default_notification_icon/color in AndroidManifest — without an explicit
      // small icon here, this foreground-display path falls back to the full-colour launcher icon.
      smallIcon: 'ic_stat_notify',
      color: '#0A7A5E',
    },
  });
}

/** Registers the current FCM token with the backend. Call after sign-in and on token refresh. */
export async function registerDeviceToken(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.requestPermission();
  }
  const token = await getToken(getMessaging());
  await notificationsApi.registerToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
}

/** Un-registers this device's current token. Call before clearing the signed-in session on logout. */
export async function unregisterDeviceToken(): Promise<void> {
  try {
    const token = await getToken(getMessaging());
    await notificationsApi.deleteToken(token);
  } catch {
    // Best-effort — a stale/unreachable token server-side just stops being sent to eventually.
  }
}

/**
 * Wires up message/tap handling for the lifetime of the app. Safe to call multiple times (e.g.
 * every sign-in) — listeners are only attached once per process.
 */
export function initPushListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  const messaging = getMessaging();

  onTokenRefresh(messaging, () => {
    registerDeviceToken().catch(() => {});
  });

  // App in foreground: FCM doesn't auto-display a system notification, so render one ourselves.
  onMessage(messaging, (message) => {
    displayMessage(message).catch(() => {});
  });

  // App opened from background by tapping a notification.
  onNotificationOpenedApp(messaging, (message) => {
    handleNotificationOpen(message.data as Record<string, string> | undefined);
  });

  // App launched (was fully quit) by tapping a notification.
  getInitialNotification(messaging).then((message) => {
    if (message) handleNotificationOpen(message.data as Record<string, string> | undefined);
  });

  // Notifee-rendered (foreground-displayed) notification tapped while the app is in the foreground.
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) handleNotificationOpen(detail.notification?.data as Record<string, string> | undefined);
  });
}
