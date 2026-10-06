import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

/** Back + pushed-screen title (+ optional right action), the header every stack screen uses. */
export function ScreenHeader({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 }}>
      <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={onBack ?? (() => navigation.goBack())} />
      <AppText variant="titlePushed" style={{ flex: 1 }} accessibilityRole="header" numberOfLines={1}>
        {title}
      </AppText>
      {right}
    </View>
  );
}
