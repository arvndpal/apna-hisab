import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Fingerprint } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { NumericKeypad } from '../../components/forms/NumericKeypad';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { verifyPin, unlockWithBiometrics } from '../../services/security/lock';
import type { RootStackParamList } from '../../app/navigation/types';

const LOGO = require('../../../design-reference/assets/logo.png');
const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

type Nav = NativeStackNavigationProp<RootStackParamList, 'LockScreen'>;

export function LockScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const lockMethod = useSettingsStore((s) => s.lockMethod);

  const [pin, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const triedBiometricRef = useRef(false);

  const unlock = () => {
    navigation.reset({ index: 0, routes: [{ name: 'App', params: { screen: 'MainTabs', params: { screen: 'Home' } } }] });
  };

  useEffect(() => {
    if (lockMethod === 'biometric' && !triedBiometricRef.current) {
      triedBiometricRef.current = true;
      unlockWithBiometrics().then((ok) => {
        if (ok) unlock();
        else setError(t('lock.biometricFailed'));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockMethod]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleKey = async (key: string) => {
    if (cooldown > 0 || key === '.') return;
    if (key === 'backspace') {
      setPinInput((p) => p.slice(0, -1));
      return;
    }
    setError(null);
    const next = (pin + key).slice(0, PIN_LENGTH);
    setPinInput(next);
    if (next.length === PIN_LENGTH) {
      const ok = await verifyPin(next);
      if (ok) {
        unlock();
        return;
      }
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setPinInput('');
      if (nextAttempts >= MAX_ATTEMPTS) {
        setCooldown(COOLDOWN_SECONDS);
        setAttempts(0);
        setError(t('lock.tooManyAttempts', { seconds: COOLDOWN_SECONDS }));
      } else {
        setError(t('lock.biometricFailed'));
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ alignItems: 'center', paddingTop: 80, gap: 16 }}>
        <Image source={LOGO} style={{ width: 72, height: 72, borderRadius: 18 }} resizeMode="contain" />
        <AppText variant="title">{t('lock.unlockTitle')}</AppText>
        {lockMethod === 'biometric' ? <Fingerprint size={28} color={palette.primary} strokeWidth={2} /> : null}
        <AppText variant="body" color="secondary">
          {t('lock.enterPin')}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: i < pin.length ? palette.primary : 'transparent',
                borderWidth: 2,
                borderColor: palette.primary,
              }}
            />
          ))}
        </View>
        {error ? (
          <AppText variant="caption" color="error" style={{ textAlign: 'center', paddingHorizontal: 32 }}>
            {error}
          </AppText>
        ) : null}
      </View>

      <View style={{ flex: 1 }} />
      <NumericKeypad onKeyPress={handleKey} onClear={() => setPinInput('')} />
      <Pressable
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Welcome' } }] })
        }
        accessibilityRole="button"
        style={{ alignItems: 'center', paddingVertical: 16 }}
      >
        <AppText variant="label" color="brand">
          {t('lock.forgotPin')}
        </AppText>
      </Pressable>
    </SafeAreaView>
  );
}
