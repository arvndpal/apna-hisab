import React, { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, IndianRupee, ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppBottomSheet } from '../../components/common/BottomSheet';
import { AppText } from '../../components/common/AppText';
import { useTheme } from '../../hooks/useTheme';
import { registerAddSheet } from '../../store/addSheetStore';
import { openUdhaarEntrySheet } from '../../store/udhaarEntrySheetStore';
import type { AppStackParamList } from '../../app/navigation/types';

function Row({ icon: Icon, tint, color, title, subtitle, onPress }: { icon: LucideIcon; tint: string; color: string; title: string; subtitle: string; onPress: () => void }) {
  const palette = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, borderWidth: 1.5, borderColor: palette.border, borderRadius: 18, paddingHorizontal: 14, marginBottom: 10 }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={color} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="section">{title}</AppText>
        <AppText variant="secondary" color="secondary">
          {subtitle}
        </AppText>
      </View>
      <ChevronRight size={20} color={palette.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}

/** Mounted once (in MainTabs); opened from anywhere via registerAddSheet/openAddSheet (addSheetStore.ts). */
export function AddTypeSheet() {
  const { t } = useTranslation();
  const palette = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  useEffect(() => {
    registerAddSheet({ present: () => sheetRef.current?.present() });
    return () => registerAddSheet(null);
  }, []);

  return (
    <AppBottomSheet ref={sheetRef} title={t('add.title')} onClose={() => {}}>
      <Row
        icon={Plus}
        tint={palette.incomeTint}
        color={palette.income}
        title={t('add.income')}
        subtitle={t('add.incomeSub')}
        onPress={() => {
          sheetRef.current?.dismiss();
          navigation.navigate('AddTransaction', { type: 'income' });
        }}
      />
      <Row
        icon={Minus}
        tint={palette.expenseTint}
        color={palette.expense}
        title={t('add.expense')}
        subtitle={t('add.expenseSub')}
        onPress={() => {
          sheetRef.current?.dismiss();
          navigation.navigate('AddTransaction', { type: 'expense' });
        }}
      />
      <Row
        icon={IndianRupee}
        tint={palette.udhaarTint}
        color={palette.udhaar}
        title={t('add.udhaar')}
        subtitle={t('add.udhaarSub')}
        onPress={() => {
          sheetRef.current?.dismiss();
          // Let this sheet's own close animation finish before presenting the next one — opening
          // a second BottomSheetModal while this one is still animating out is unreliable.
          setTimeout(() => openUdhaarEntrySheet(), 300);
        }}
      />
    </AppBottomSheet>
  );
}
