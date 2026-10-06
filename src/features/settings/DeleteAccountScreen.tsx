import React, { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import { Check, Download, TriangleAlert } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Banner } from '../../components/common/Banner';
import { Button } from '../../components/common/Button';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getFirebaseIdToken } from '../../services/auth/google';
import * as authApi from '../../services/api/authApi';
import { ApiError } from '../../services/api/client';
import { clearPin, disableBiometrics } from '../../services/security/lock';
import { fontFamily, radius, typography } from '../../theme/tokens';
import { useResetToWelcome } from './useLogout';
import type { AppStackParamList } from '../../app/navigation/types';
import { suppressNextResumeLock } from '../../app/navigation/resumeLock';

/** Must be typed exactly, in every language (SCREENS.md §19d). */
const CONFIRM_WORD = 'DELETE';

type Problem = 'needInternet' | 'wrongAccount' | 'failed';

export function DeleteAccountScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const signOut = useAuthStore((s) => s.signOut);
  const setLockMethod = useSettingsStore((s) => s.setLockMethod);
  const resetToWelcome = useResetToWelcome();

  const [typed, setTyped] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  const canDelete = typed === CONFIRM_WORD && understood && !busy;

  const handleDelete = async () => {
    setProblem(null);
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      setProblem('needInternet');
      return;
    }
    setBusy(true);
    try {
      // Re-auth: the backend only deletes for a fresh token from the same Google account.
      suppressNextResumeLock();
      const idToken = await getFirebaseIdToken();
      if (!idToken) return; // Account picker cancelled — nothing happened.
      await authApi.deleteAccount(idToken);
    } catch (e) {
      setProblem(e instanceof ApiError && e.status === 403 ? 'wrongAccount' : 'failed');
      return;
    } finally {
      setBusy(false);
    }

    // Server side is gone — now wipe this phone: SQLite rows, backend tokens, Google session, PIN.
    await signOut();
    await clearPin();
    await disableBiometrics();
    setLockMethod('none');
    resetToWelcome();
  };

  // "Type DELETE to confirm" with the word itself in bold, wherever the translation puts it.
  const [labelBefore, labelAfter = ''] = t('deleteAccount.typeToConfirm').split(CONFIRM_WORD);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface }} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title={t('deleteAccount.screenTitle')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.errorTint, alignItems: 'center', justifyContent: 'center' }}>
            <TriangleAlert size={26} color={palette.error} strokeWidth={2} />
          </View>
          <AppText variant="title" accessibilityRole="header">
            {t('deleteAccount.title')}
          </AppText>
          <View style={{ backgroundColor: palette.errorTint, borderRadius: radius.card, padding: 14 }}>
            <AppText variant="body">{t('deleteAccount.body')}</AppText>
          </View>

          <Button label={t('deleteAccount.exportFirst')} variant="secondary" icon={Download} onPress={() => navigation.navigate('Export')} />

          <View style={{ gap: 8 }}>
            <AppText variant="label" color="secondary">
              {labelBefore}
              <AppText variant="label" style={{ fontFamily: fontFamily[700] }}>
                {CONFIRM_WORD}
              </AppText>
              {labelAfter}
            </AppText>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel={t('deleteAccount.typeToConfirm')}
              style={{
                height: 54,
                borderRadius: radius.input,
                borderWidth: 1.5,
                borderColor: palette.border,
                paddingHorizontal: 16,
                fontFamily: fontFamily[typography.body.weight],
                fontSize: 16,
                color: palette.textPrimary,
              }}
            />
          </View>

          <Pressable
            onPress={() => setUnderstood((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: understood }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: understood ? palette.error : palette.textTertiary,
                backgroundColor: understood ? palette.error : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {understood ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
            </View>
            <AppText variant="body" style={{ flex: 1 }}>
              {t('deleteAccount.understand')}
            </AppText>
          </Pressable>

          {problem ? <Banner variant="warning" title={t(`deleteAccount.${problem}`)} onDismiss={() => setProblem(null)} /> : null}

          <View style={{ flex: 1 }} />
          <Button label={t('deleteAccount.confirm')} variant="danger" onPress={handleDelete} disabled={!canDelete && !busy} loading={busy} />
          <Button label={t('deleteAccount.keep')} variant="ghost" onPress={() => navigation.goBack()} disabled={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
