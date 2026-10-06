/**
 * Apna Hisab
 * @format
 */
import './global.css';
import React, { useEffect, useRef } from 'react';
import { AppState, StatusBar, type AppStateStatus } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { AppProviders } from './src/app/providers/AppProviders';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { sync } from './src/sync/syncEngine/engine';
import { shouldLockOnResume } from './src/app/navigation/resumeLock';
import { useSettingsStore } from './src/store/settingsStore';
import type { RootStackParamList } from './src/app/navigation/types';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

function App() {
  const appState = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) ?? 'active');
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    // App-foreground trigger (ARCHITECTURE.md §6) — sync() itself no-ops if signed out or offline.
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background') backgroundedAt.current = Date.now();
      if (/inactive|background/.test(appState.current) && next === 'active') {
        sync();
        const { lockMethod, lockAfterMs } = useSettingsStore.getState();
        const rootState = navigationRef.isReady() ? navigationRef.getRootState() : undefined;
        const currentRootRoute = rootState?.routes[rootState.index]?.name;
        if (shouldLockOnResume({ lockMethod, lockAfterMs, backgroundedAt: backgroundedAt.current, now: Date.now(), currentRootRoute })) {
          navigationRef.navigate('LockScreen', { resume: true });
        }
        backgroundedAt.current = null;
      }
      appState.current = next;
    });
    return () => subscription.remove();
  }, []);

  return (
    <AppProviders>
      <StatusBar barStyle="light-content" />
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}

export default App;
