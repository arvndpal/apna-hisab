/**
 * @format
 */
import 'react-native-gesture-handler';
import 'react-native-get-random-values';

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Must be registered here, outside the React tree (react-native-firebase requirement) — our pushes
// always carry a `notification` block, so Android/iOS already display it from the system tray while
// backgrounded/killed; this handler just satisfies that requirement for any future data-only push.
setBackgroundMessageHandler(getMessaging(), async () => {});

AppRegistry.registerComponent(appName, () => App);
