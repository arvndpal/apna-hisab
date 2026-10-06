import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** The app's single NavigationContainer ref — lets non-screen code (resume lock, ad rules) read the current route. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function currentRouteName(): string | undefined {
  return navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
}
