import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { Option } from '../../components/common/Option';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { hasHardwareBiometrics } from '../../services/security/lock';
import type { AuthStackParamList, RootStackParamList } from '../../app/navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'AppLockSetup'>;

type LockChoice = 'pin' | 'biometric' | 'skip';

export function AppLockSetupScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const setLockMethod = useSettingsStore((s) => s.setLockMethod);
  const setOnboardingDone = useSettingsStore((s) => s.setOnboardingDone);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [selected, setSelected] = useState<LockChoice>('biometric');

  useEffect(() => {
    hasHardwareBiometrics().then((available) => {
      setBiometricAvailable(available);
      if (!available) setSelected('pin');
    });
  }, []);

  const handleContinue = () => {
    if (selected === 'skip') {
      setLockMethod('none');
      setOnboardingDone(true);
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.reset({
        index: 0,
        routes: [{ name: 'App', params: { screen: 'MainTabs', params: { screen: 'Home' } } }],
      });
      return;
    }
    navigation.navigate('PinCreate', { method: selected });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.surface, paddingTop: 64, paddingHorizontal: 20 }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={26} color={palette.primary} strokeWidth={2} />
      </View>
      <AppText variant="display" style={{ marginTop: 20 }}>
        {t('lock.setupTitle')}
      </AppText>
      <AppText variant="body" color="secondary" style={{ marginTop: 6 }}>
        {t('lock.setupBody')}
      </AppText>

      <View style={{ marginTop: 28, gap: 12 }}>
        <Option
          title={t('lock.biometric')}
          subtitle={biometricAvailable ? t('lock.biometricSub') : t('lock.biometricUnavailable')}
          badge={biometricAvailable ? t('lock.recommended') : undefined}
          selected={selected === 'biometric'}
          disabled={!biometricAvailable}
          onPress={() => setSelected('biometric')}
        />
        <Option title={t('lock.pin')} subtitle={t('lock.pinSub')} selected={selected === 'pin'} onPress={() => setSelected('pin')} />
        <Option title={t('lock.skip')} subtitle={t('lock.skipSub')} selected={selected === 'skip'} onPress={() => setSelected('skip')} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingBottom: 24 }}>
        <Button label={t('common.continue')} onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}
