import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useSettingsStore } from '../../store/settingsStore';
import * as transactionsRepo from '../../database/repositories/transactionsRepo';
import { monthMatrix } from './calendarMatrix';
import { toOccurredOn } from '../../utils/dates';
import { formatRupees } from '../../utils/money';
import { radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../app/navigation/types';
import type { Summary } from '../../types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'CustomRange'>;

const MS_PER_DAY = 86_400_000;
const MAX_RANGE_DAYS = 3 * 366;

function clone(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date): boolean {
  return toOccurredOn(a) === toOccurredOn(b);
}

export function CustomRangeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const palette = useTheme();
  const userId = useActiveUserId();
  const language = useSettingsStore((s) => s.language);
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const today = clone(new Date());

  const [from, setFrom] = useState(startOfMonth(today));
  const [to, setTo] = useState(today);
  const [activeField, setActiveField] = useState<'from' | 'to'>('from');
  const [calendarAnchor, setCalendarAnchor] = useState(startOfMonth(today));
  const [result, setResult] = useState<Summary | null>(null);

  const fmt = (d: Date) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  const rangeTooLong = (to.getTime() - from.getTime()) / MS_PER_DAY > MAX_RANGE_DAYS;

  const selectField = (field: 'from' | 'to') => {
    setActiveField(field);
    setCalendarAnchor(startOfMonth(field === 'from' ? from : to));
  };

  const pickDay = (day: Date) => {
    if (day.getTime() > today.getTime()) return;
    setResult(null);
    if (activeField === 'from') {
      setFrom(day);
      if (day.getTime() > to.getTime()) setTo(day);
    } else {
      setTo(day);
      if (day.getTime() < from.getTime()) setFrom(day);
    }
  };

  const generate = () => {
    if (rangeTooLong) return;
    setResult(transactionsRepo.summary({ userId, from: toOccurredOn(from), to: toOccurredOn(to) }));
  };

  const cells = monthMatrix(calendarAnchor.getFullYear(), calendarAnchor.getMonth());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
        <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} />
        <AppText variant="titlePushed">{t('reports.customTitle')}</AppText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['from', 'to'] as const).map((field) => {
            const active = activeField === field;
            return (
              <Pressable
                key={field}
                onPress={() => selectField(field)}
                accessibilityRole="button"
                accessibilityLabel={`${t(`reports.${field}`)} ${fmt(field === 'from' ? from : to)}`}
                style={{ flex: 1, gap: 6 }}
              >
                <AppText variant="label" color="secondary">
                  {t(`reports.${field}`)}
                </AppText>
                <View
                  style={{
                    height: 54,
                    borderRadius: radius.input,
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? palette.primary : palette.border,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: palette.surface,
                  }}
                >
                  <AppText variant="rowTitle">{fmt(field === 'from' ? from : to)}</AppText>
                  <Calendar size={18} color={palette.textTertiary} strokeWidth={2} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
            <IconButton icon={ChevronLeft} accessibilityLabel={t('common.previous')} onPress={() => setCalendarAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1))} />
            <AppText variant="rowTitle">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(calendarAnchor)}</AppText>
            <IconButton icon={ChevronRight} accessibilityLabel={t('common.next')} onPress={() => setCalendarAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1))} />
          </View>

          <View style={{ flexDirection: 'row' }}>
            {(language === 'hi' ? ['सो', 'मं', 'बु', 'गु', 'शु', 'श', 'र'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <AppText variant="caption" color="secondary">
                  {d}
                </AppText>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={{ width: '14.2857%', height: 40 }} />;
              const isFrom = sameDay(day, from);
              const isTo = sameDay(day, to);
              const isEndpoint = isFrom || isTo;
              const inRange = day.getTime() >= from.getTime() && day.getTime() <= to.getTime();
              const future = day.getTime() > today.getTime();

              return (
                <View key={i} style={{ width: '14.2857%', height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Pressable
                    onPress={() => pickDay(day)}
                    disabled={future}
                    accessibilityRole="button"
                    accessibilityLabel={fmt(day)}
                    accessibilityState={{ selected: isEndpoint, disabled: future }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: isEndpoint ? 17 : 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isEndpoint ? palette.primary : inRange ? palette.primaryTint : 'transparent',
                    }}
                  >
                    <AppText variant="secondary" style={{ color: isEndpoint ? '#FFFFFF' : future ? palette.textTertiary : inRange ? palette.primaryPress : palette.textPrimary }}>
                      {day.getDate()}
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Card>

        {rangeTooLong ? (
          <AppText variant="caption" color="error">
            {t('reports.rangeTooLong')}
          </AppText>
        ) : null}

        <Button label={t('reports.generate')} onPress={generate} disabled={rangeTooLong} />

        {result ? (
          <Card>
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 }}>
                <AppText variant="label" color="secondary">
                  {t('transactions.income')}
                </AppText>
                <AppText variant="rowTitle" color="income">
                  {formatRupees(result.incomePaise, 'neutral', false)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 }}>
                <AppText variant="label" color="secondary">
                  {t('transactions.expense')}
                </AppText>
                <AppText variant="rowTitle" color="expense">
                  {formatRupees(result.expensePaise, 'neutral', false)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, borderTopWidth: 1, borderTopColor: palette.border, marginTop: 2, paddingTop: 6 }}>
                <AppText variant="rowTitle">{t('reports.netLabel')}</AppText>
                <AppText variant="amountM" color={result.netPaise >= 0 ? 'income' : 'expense'}>
                  {formatRupees(result.netPaise, 'net')}
                </AppText>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <Button
                label={t('reports.viewFull')}
                variant="secondary"
                onPress={() =>
                  navigation.navigate('MainTabs', {
                    screen: 'Reports',
                    params: { period: 'custom', from: toOccurredOn(from), to: toOccurredOn(to) },
                  })
                }
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
