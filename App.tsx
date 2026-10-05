/**
 * Apna Hisab
 * @format
 */
import './global.css';
import React, { useEffect, useRef } from 'react';
import { AppState, StatusBar, type AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppProviders } from './src/app/providers/AppProviders';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { sync } from './src/sync/syncEngine/engine';

function App() {
  const appState = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) ?? 'active');

  useEffect(() => {
    // App-foreground trigger (ARCHITECTURE.md §6) — sync() itself no-ops if signed out or offline.
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (/inactive|background/.test(appState.current) && next === 'active') sync();
      appState.current = next;
    });
    return () => subscription.remove();
  }, []);

  return (
    <AppProviders>
      <StatusBar barStyle="light-content" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}

export default App;
