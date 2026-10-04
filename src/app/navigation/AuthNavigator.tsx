import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../../features/auth/WelcomeScreen';
import { LoginScreen } from '../../features/auth/LoginScreen';
import { LanguageScreen } from '../../features/settings/LanguageScreen';
import { AppLockSetupScreen } from '../../features/settings/AppLockSetupScreen';
import { PinCreateScreen } from '../../features/settings/PinCreateScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageScreen} />
      <Stack.Screen name="AppLockSetup" component={AppLockSetupScreen} />
      <Stack.Screen name="PinCreate" component={PinCreateScreen} />
    </Stack.Navigator>
  );
}
