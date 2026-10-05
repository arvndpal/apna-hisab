import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ShieldCheck, User, CloudUpload, type LucideIcon } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { Card } from '../../components/common/Card';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { RootStackParamList, AuthStackParamList } from '../../app/navigation/types';
import { ChevronLeft } from 'lucide-react-native';
import { getFirebaseIdToken } from '../../services/auth/google';
import * as authApi from '../../services/api/authApi';
import { showToast } from '../../store/toastStore';
import { start as startSync } from '../../sync/syncEngine/engine';
import { seedDefaultCategories } from '../../database/seed';
import { getActiveUserId } from '../../database/repositories/settingsRepo';

const LOGO = require('../../../design-reference/assets/logo.png');

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const TRUST_ROWS: Array<{ icon: LucideIcon; titleKey: string; subKey: string }> = [
  { icon: ShieldCheck, titleKey: 'auth.trustPrivateTitle', subKey: 'auth.trustPrivateSub' },
  { icon: User, titleKey: 'auth.trustMinimalTitle', subKey: 'auth.trustMinimalSub' },
  { icon: CloudUpload, titleKey: 'auth.trustBackupTitle', subKey: 'auth.trustBackupSub' },
];

export function LoginScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const signIn = useAuthStore((s) => s.signIn);
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const firebaseIdToken = await getFirebaseIdToken();
      if (!firebaseIdToken) {
        // User cancelled the Google account picker — not an error.
        setLoading(false);
        return;
      }
      const { tokens, profile } = await authApi.signInWithGoogle(firebaseIdToken);
      await signIn(profile, tokens);
      // SplashScreen seeds defaults on cold boot, but a logout→login cycle never revisits Splash —
      // without this, a fresh sign-in (local data just wiped by logout) would have zero categories.
      seedDefaultCategories(getActiveUserId());
      startSync(); // fire-and-forget

      if (onboardingDone) {
        navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.reset({
          index: 0,
          routes: [{ name: 'App', params: { screen: 'MainTabs', params: { screen: 'Home' } } }],
        });
      } else {
        navigation.navigate('LanguageSelect');
      }
    } catch {
      // Never surface raw error text here — SCREENS.md §22: always plain language, never codes.
      showToast({ message: t('auth.signInFailed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} />
      </View>

      <View style={{ paddingHorizontal: 20, gap: 16, marginTop: 8 }}>
        <Image source={LOGO} style={{ width: 64, height: 64, borderRadius: 16 }} resizeMode="contain" />
        <AppText variant="display">{t('auth.welcomeTitle')}</AppText>
        <AppText variant="body" color="secondary">
          {t('auth.welcomeSub')}
        </AppText>

        <Card>
          <View style={{ gap: 16 }}>
            {TRUST_ROWS.map((row, i) => (
              <View key={row.titleKey} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingTop: i === 0 ? 0 : 0 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: palette.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
                  <row.icon size={20} color={palette.primary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="rowTitle">{t(row.titleKey)}</AppText>
                  <AppText variant="secondary" color="secondary">
                    {t(row.subKey)}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 10 }}>
        <Button label={t(loading ? 'auth.signingIn' : 'auth.continueWithGoogle')} loading={loading} onPress={handleSignIn} />
        <AppText variant="caption" color="secondary" style={{ textAlign: 'center' }}>
          {t('auth.pickAccountNext')}
        </AppText>
      </View>
    </SafeAreaView>
  );
}
