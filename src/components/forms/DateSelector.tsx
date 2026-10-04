import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar, Check } from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Chip } from '../common/Chip';
import { AppText } from '../common/AppText';
import { AppBottomSheet } from '../common/BottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { toOccurredOn } from '../../utils/dates';

export interface DateSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
}

function sameDay(a: Date, b: Date): boolean {
  return toOccurredOn(a) === toOccurredOn(b);
}

function withTimeOf(date: Date, timeSource: Date): Date {
  const next = new Date(date);
  next.setHours(timeSource.getHours(), timeSource.getMinutes(), timeSource.getSeconds(), 0);
  return next;
}

export function DateSelector({ value, onChange }: DateSelectorProps) {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const sheetRef = useRef<BottomSheetModal>(null);
  const [showNativePicker, setShowNativePicker] = useState(false);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = sameDay(value, today);
  const isYesterday = sameDay(value, yesterday);

  const formatted = new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'short' }).format(value);
  const label = isToday ? `${t('common.today')}, ${formatted}` : isYesterday ? `${t('common.yesterday')}, ${formatted}` : formatted;

  return (
    <>
      <Chip label={label} icon={Calendar} showChevron onPress={() => sheetRef.current?.present()} />
      <AppBottomSheet ref={sheetRef} title={t('add.date')} onClose={() => sheetRef.current?.dismiss()}>
        <View style={{ gap: 4 }}>
          {[
            { key: 'today', label: t('common.today'), date: today, selected: isToday },
            { key: 'yesterday', label: t('common.yesterday'), date: yesterday, selected: isYesterday },
          ].map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => {
                onChange(withTimeOf(opt.date, value));
                sheetRef.current?.dismiss();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: opt.selected }}
              style={{ minHeight: 54, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}
            >
              <AppText variant="rowTitle" style={{ flex: 1 }}>
                {opt.label}
              </AppText>
              {opt.selected ? <Check size={20} color={palette.primary} strokeWidth={2.5} /> : null}
            </Pressable>
          ))}
          <Pressable
            onPress={() => setShowNativePicker(true)}
            style={{ minHeight: 54, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}
          >
            <Calendar size={20} color={palette.textPrimary} strokeWidth={2} />
            <AppText variant="rowTitle" style={{ flex: 1 }}>
              {t('common.pickDate')}
            </AppText>
          </Pressable>
        </View>
      </AppBottomSheet>
      {showNativePicker ? (
        <DateTimePicker
          value={value}
          mode="date"
          maximumDate={today}
          display="default"
          onChange={(event, selected) => {
            setShowNativePicker(false);
            if (event.type === 'set' && selected) {
              onChange(withTimeOf(selected, value));
              sheetRef.current?.dismiss();
            }
          }}
        />
      ) : null}
    </>
  );
}
