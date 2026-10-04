import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Globe } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { Option } from '../../components/common/Option';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import type { AuthStackParamList } from '../../app/navigation/types';
import type { Language } from '../../types/models';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'LanguageSelect'>;
type Route = RouteProp<AuthStackParamList, 'LanguageSelect'>;

export function LanguageScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const fromSettings = route.params?.fromSettings;
  const currentLanguage = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const [selected, setSelected] = useState<Language>(currentLanguage);

  const handleContinue = () => {
    setLanguage(selected);
    if (fromSettings) {
      navigation.goBack();
    } else {
      navigation.navigate('AppLockSetup');
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.surface, paddingTop: 64, paddingHorizontal: 20 }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
        <Globe size={26} color={palette.primary} strokeWidth={2} />
      </View>
      <AppText variant="display" style={{ marginTop: 20 }}>
        {t('language.title')}
      </AppText>
      <AppText variant="section" color="secondary" style={{ marginTop: 2 }}>
        अपनी भाषा चुनें
      </AppText>

      <View style={{ marginTop: 28, gap: 12 }}>
        <Option title={t('language.english')} subtitle={t('language.englishSample')} selected={selected === 'en'} onPress={() => setSelected('en')} minHeight={76} />
        <Option title={t('language.hindi')} subtitle={t('language.hindiSample')} selected={selected === 'hi'} onPress={() => setSelected('hi')} minHeight={76} />
      </View>

      <AppText variant="caption" color="secondary" style={{ marginTop: 16 }}>
        {t('language.changeLater')}
      </AppText>

      <View style={{ flex: 1 }} />

      <View style={{ paddingBottom: 24 }}>
        <Button label={t('common.continue')} onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}
