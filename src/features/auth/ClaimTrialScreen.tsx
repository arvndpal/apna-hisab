import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Gift } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { showToast } from '../../store/toastStore';
import { claimFreeTrial } from '../../services/subscription/subscription';
import { BENEFITS } from '../subscription/PremiumScreen';
import type { RootStackParamList, AuthStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ClaimTrial'>;
type Nav = NativeStackNavigationProp<AuthStackParamList, 'ClaimTrial'>;

/**
 * Shown right after sign-in, only to an account that's never claimed the trial or bought a plan
 * (LoginScreen checks this via /subscriptions/me before routing here). Claiming — or skipping — both
 * continue the same onboarding path LoginScreen would have taken on its own.
 */
export function ClaimTrialScreen({ route }: Props) {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  const [claiming, setClaiming] = useState(false);
  const { trialDays } = route.params;

  const proceed = () => {
    if (onboardingDone) {
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.reset({
        index: 0,
        routes: [{ name: 'App', params: { screen: 'MainTabs', params: { screen: 'Home' } } }],
      });
    } else {
      navigation.navigate('LanguageSelect');
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await claimFreeTrial();
      showToast({ message: t('trial.claimed') });
    } catch {
      // Best-effort — claiming again later from the Premium screen still works.
    } finally {
      setClaiming(false);
      proceed();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 20, gap: 18 }}>
        <View style={{ flex: 1 }} />
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.warningTint, alignItems: 'center', justifyContent: 'center' }}>
          <Gift size={28} color={palette.warning} strokeWidth={2} />
        </View>

        <AppText variant="display" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
          {t('trial.title', { days: trialDays })}
        </AppText>
        <AppText variant="body" color="secondary" style={{ fontSize: 17, lineHeight: 24 }}>
          {t('trial.sub')}
        </AppText>

        <View style={{ gap: 14 }}>
          {BENEFITS.map((key) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Check size={22} color={palette.income} strokeWidth={2.5} />
              <AppText variant="rowTitle" style={{ fontWeight: '500', flex: 1 }}>
                {t(key)}
              </AppText>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <Button label={t('trial.claim')} onPress={handleClaim} loading={claiming} />
        <Button label={t('trial.skip')} variant="ghost" onPress={proceed} />
        <View style={{ height: 8 }} />
      </View>
    </SafeAreaView>
  );
}
