import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/common/AppText';
import { Amount } from '../../components/common/Amount';
import { Card } from '../../components/common/Card';
import { IconButton } from '../../components/common/IconButton';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useSettingsStore } from '../../store/settingsStore';
import * as transactionsRepo from '../../database/repositories/transactionsRepo';
import * as reportsRepo from '../../database/repositories/reportsRepo';
import { monthMatrix } from './calendarMatrix';
import { toOccurredOn } from '../../utils/dates';
import { formatCompact } from '../../utils/money';
import type { AppStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'FinancialCalendar'>;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function FinancialCalendarScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const palette = useTheme();
  const userId = useActiveUserId();
  const language = useSettingsStore((s) => s.language);
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const data = useLiveQuery(
    ['transactions'],
    () => {
      const from = toOccurredOn(startOfMonth(anchor));
      const to = toOccurredOn(endOfMonth(anchor));
      const daily = reportsRepo.dailyTotals(userId, { from, to });
      return {
        summary: transactionsRepo.summary({ userId, from, to }),
        byDay: new Map(daily.map((d) => [d.occurredOn, d])),
      };
    },
    [userId, anchor],
  );

  useEffect(() => {
    const todayOn = toOccurredOn(new Date());
    const inThisMonth = toOccurredOn(startOfMonth(new Date())) === toOccurredOn(startOfMonth(anchor));
    if (inThisMonth) {
      setSelectedDate(todayOn);
      return;
    }
    const sorted = Array.from(data.byDay.keys()).sort();
    setSelectedDate(sorted[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gesture) => Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_e, gesture) => {
        if (gesture.dx < -40) setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1));
        else if (gesture.dx > 40) setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1));
      },
    }),
  ).current;

  const cells = monthMatrix(anchor.getFullYear(), anchor.getMonth());
  const selectedDay = data.byDay.get(selectedDate ?? '');
  const selectedNet = selectedDay ? selectedDay.incomePaise - selectedDay.expensePaise : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
        <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} />
        <AppText variant="titlePushed">{t('reports.calendarTitle')}</AppText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton outlined icon={ChevronLeft} accessibilityLabel={t('common.previous')} onPress={() => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1))} />
          <AppText variant="section">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(anchor)}</AppText>
          <IconButton outlined icon={ChevronRight} accessibilityLabel={t('common.next')} onPress={() => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1))} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
            <AppText variant="caption" color="secondary">
              {t('transactions.income')}
            </AppText>
            <AppText variant="rowTitle" color="income">
              {formatCompact(data.summary.incomePaise)}
            </AppText>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
            <AppText variant="caption" color="secondary">
              {t('transactions.expense')}
            </AppText>
            <AppText variant="rowTitle" color="expense">
              {formatCompact(data.summary.expensePaise)}
            </AppText>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
            <AppText variant="caption" color="secondary">
              {t('reports.netLabel')}
            </AppText>
            <AppText variant="rowTitle" color={data.summary.netPaise >= 0 ? 'income' : 'expense'}>
              {formatCompact(data.summary.netPaise, true)}
            </AppText>
          </Card>
        </View>

        <Card {...panResponder.panHandlers}>
          <View style={{ flexDirection: 'row' }}>
            {(language === 'hi' ? ['सो', 'मं', 'बु', 'गु', 'शु', 'श', 'र'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <AppText variant="caption" color="secondary">
                  {d}
                </AppText>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={{ width: '14.2857%', height: 54 }} />;
              const on = toOccurredOn(day);
              const totals = data.byDay.get(on);
              const net = totals ? totals.incomePaise - totals.expensePaise : 0;
              const hasData = !!totals;
              const selected = on === selectedDate;
              const bg = hasData ? (net >= 0 ? palette.incomeTint : palette.expenseTint) : 'transparent';

              return (
                <View key={i} style={{ width: '14.2857%', height: 54, padding: 2 }}>
                  <Pressable
                    onPress={() => setSelectedDate(on)}
                    accessibilityRole="button"
                    accessibilityLabel={hasData ? `${day.getDate()}, ${t(net >= 0 ? 'reports.savedMoney' : 'reports.spentMoreDay')} ${formatCompact(net, true)}` : String(day.getDate())}
                    accessibilityState={{ selected }}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      backgroundColor: bg,
                      borderWidth: selected ? 1.5 : 0,
                      borderColor: palette.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="secondary" style={{ fontWeight: '700' }}>
                      {day.getDate()}
                    </AppText>
                    {hasData ? (
                      <AppText variant="caption" style={{ color: net >= 0 ? palette.income : palette.expense, fontSize: 9.5 }}>
                        {formatCompact(net, true)}
                      </AppText>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.incomeTint, borderWidth: 1.5, borderColor: palette.income }} />
            <AppText variant="caption" color="secondary">
              {t('reports.savedMoney')}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.expenseTint, borderWidth: 1.5, borderColor: palette.expense }} />
            <AppText variant="caption" color="secondary">
              {t('reports.spentMoreDay')}
            </AppText>
          </View>
        </View>

        {selectedDate ? (
          <Card onPress={() => navigation.navigate('DayTransactions', { date: selectedDate })} style={{ borderWidth: 1.5, borderColor: palette.primary }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: palette.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} color={palette.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <AppText variant="rowTitle">
                    {new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${selectedDate}T00:00:00`))} · {t('reports.netLabel')}
                  </AppText>
                  <Amount paise={selectedNet} kind="net" size="row" />
                </View>
                <AppText variant="secondary" color="secondary">
                  {t(selectedDay && selectedDay.count === 1 ? 'reports.dayTransactions_one' : 'reports.dayTransactions_other', { count: selectedDay?.count ?? 0 })}
                </AppText>
              </View>
              <ChevronRight size={20} color={palette.textTertiary} strokeWidth={2} />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
