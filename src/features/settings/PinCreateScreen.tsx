import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { NumericKeypad } from '../../components/forms/NumericKeypad';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { setPin, enableBiometrics } from '../../services/security/lock';
import type { AuthStackParamList, RootStackParamList } from '../../app/navigation/types';

const PIN_LENGTH = 4;

type Nav = NativeStackNavigationProp<AuthStackParamList, 'PinCreate'>;
type Route = RouteProp<AuthStackParamList, 'PinCreate'>;

function Dots({ filled }: { filled: number }) {
  const palette = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: i < filled ? palette.primary : 'transparent',
            borderWidth: 2,
            borderColor: palette.primary,
          }}
        />
      ))}
    </View>
  );
}

export function PinCreateScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const setLockMethod = useSettingsStore((s) => s.setLockMethod);
  const setOnboardingDone = useSettingsStore((s) => s.setOnboardingDone);

  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [current, setCurrent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const finish = async (confirmedPin: string) => {
    await setPin(confirmedPin);
    if (route.params.method === 'biometric') {
      await enableBiometrics();
      setLockMethod('biometric');
    } else {
      setLockMethod('pin');
    }
    if (route.params.fromSettings) {
      // Opened on top of the App stack from Settings: leave the Auth stack and land back there.
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.goBack();
      return;
    }
    setOnboardingDone(true);
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.reset({
      index: 0,
      routes: [{ name: 'App', params: { screen: 'MainTabs', params: { screen: 'Home' } } }],
    });
  };

  const handleKey = (key: string) => {
    if (key === 'backspace' || key === '.') {
      if (key === 'backspace') setCurrent((c) => c.slice(0, -1));
      return;
    }
    setError(null);
    const next = (current + key).slice(0, PIN_LENGTH);
    setCurrent(next);
    if (next.length === PIN_LENGTH) {
      if (firstPin === null) {
        setTimeout(() => {
          setFirstPin(next);
          setCurrent('');
        }, 150);
      } else if (next === firstPin) {
        finish(next);
      } else {
        setError(t('lock.pinMismatch'));
        setTimeout(() => {
          setFirstPin(null);
          setCurrent('');
        }, 600);
      }
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.surface, paddingTop: 80, paddingHorizontal: 20 }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={{ alignItems: 'center', gap: 20 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={26} color={palette.primary} strokeWidth={2} />
        </View>
        <AppText variant="title">{firstPin === null ? t('lock.createPin') : t('lock.confirmPin')}</AppText>
        <Dots filled={current.length} />
        {error ? (
          <AppText variant="caption" color="error">
            {error}
          </AppText>
        ) : null}
      </View>

      <View style={{ flex: 1 }} />
      <NumericKeypad onKeyPress={handleKey} onClear={() => setCurrent('')} />
      <View style={{ height: 24 }} />
    </SafeAreaView>
  );
}
