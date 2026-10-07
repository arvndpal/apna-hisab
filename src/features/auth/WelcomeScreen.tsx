import React from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from '../../components/common/AppText';
import { Amount } from '../../components/common/Amount';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import type { AuthStackParamList } from '../../app/navigation/types';

const LOGO = require('../../../design-reference/assets/logo.png');

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const { height } = useWindowDimensions();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={LOGO} style={{ width: 30, height: 30, borderRadius: 8 }} resizeMode="contain" />
          <AppText variant="section" color="brand">
            {t('app.name')}
          </AppText>
        </View>
        <Pressable
          onPress={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
          accessibilityRole="button"
          accessibilityLabel={t('language.toggle')}
          style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: palette.muted, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="label">EN · हिं</AppText>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <AppText variant="displayWelcome">
          <AppText variant="displayWelcome" color="income">
            {t('welcome.headline1')}
          </AppText>
          {'\n'}
          <AppText variant="displayWelcome" color="expense">
            {t('welcome.headline2')}
          </AppText>
          {'\n'}
          <AppText variant="displayWelcome" color="brand">
            {t('welcome.headline3')}
          </AppText>
        </AppText>
      </View>

      {height >= 640 ? (
        <View
          style={{ marginTop: 24, marginHorizontal: 20, backgroundColor: palette.background, borderRadius: 16, padding: 16, gap: 10 }}
          importantForAccessibility="no-hide-descendants"
        >
          <AppText variant="caption" color="secondary">
            {t('common.today')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: palette.surface, borderRadius: 12, padding: 12 }}>
              <AppText variant="label" color="secondary">
                {t('home.income')}
              </AppText>
              <Amount paise={285000} kind="income" size="M" />
            </View>
            <View style={{ flex: 1, backgroundColor: palette.surface, borderRadius: 12, padding: 12 }}>
              <AppText variant="label" color="secondary">
                {t('home.expense')}
              </AppText>
              <Amount paise={75000} kind="expense" size="M" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="label" color="secondary">
              {t('home.todayNet')}
            </AppText>
            <Amount paise={210000} kind="net" size="M" />
          </View>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <AppText variant="body" color="secondary">
          {t('welcome.body')}
        </AppText>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}>
        <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="button" accessibilityLabel={t('auth.continueWithGoogle')}>
          {({ pressed }) => (
            <View
              style={{
                height: 56,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: palette.border,
                backgroundColor: palette.surface,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                opacity: pressed ? 0.85 : 1,
              }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  G
                </AppText>
              </View>
              <AppText variant="button">{t('auth.continueWithGoogle')}</AppText>
            </View>
          )}
        </Pressable>
        <AppText variant="caption" color="secondary" style={{ textAlign: 'center' }}>
          {t('welcome.terms', { terms: t('welcome.termsLink'), privacy: t('welcome.privacyLink') })}
        </AppText>
      </View>
    </SafeAreaView>
  );
}
