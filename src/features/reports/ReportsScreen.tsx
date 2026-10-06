import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, PieChart as PieChartIcon } from 'lucide-react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { AppText } from '../../components/common/AppText';
import { IconButton } from '../../components/common/IconButton';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { GradientSurface } from '../../components/common/GradientSurface';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useCategoriesById } from '../../hooks/useCategories';
import { useSettingsStore } from '../../store/settingsStore';
import { openAddSheet } from '../../store/addSheetStore';
import * as reportsRepo from '../../database/repositories/reportsRepo';
import * as transactionsRepo from '../../database/repositories/transactionsRepo';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import { getPeriodRange, stepAnchor, isCurrentPeriod, periodLabel, trendBuckets } from './periods';
import { toOccurredOn } from '../../utils/dates';
import { formatRupees, formatCompact } from '../../utils/money';
import { radius, chartColors } from '../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../app/navigation/types';
import type { DateRange, ReportPeriod } from '../../types/models';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type ReportsRoute = RouteProp<MainTabParamList, 'Reports'>;

const PERIOD_CHIPS: Array<{ value: ReportPeriod; labelKey: string }> = [
  { value: 'today', labelKey: 'reports.today' },
  { value: 'week', labelKey: 'reports.week' },
  { value: 'month', labelKey: 'reports.month' },
  { value: 'quarter', labelKey: 'reports.quarter' },
  { value: '6m', labelKey: 'reports.sixMonths' },
  { value: 'year', labelKey: 'reports.year' },
];

function heroPeriodLabel(period: ReportPeriod, anchor: Date, language: 'en' | 'hi', t: (k: string) => string): string {
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  if (period === 'month') return new Intl.DateTimeFormat(locale, { month: 'long' }).format(anchor);
  if (period === 'year') return String(anchor.getFullYear());
  if (period === '6m') return t('reports.sixMonths');
  if (period === 'custom') return t('reports.custom');
  return t(`reports.${period}`);
}

/** Shared tap/press tooltip for the bar and trend charts — date plus that point's income and expense. */
function ChartTooltip({
  label,
  incomePaise,
  expensePaise,
  palette,
  t,
}: {
  label: string;
  incomePaise: number;
  expensePaise: number;
  palette: ReturnType<typeof useTheme>;
  t: (key: string) => string;
}) {
  return (
    <View style={{ backgroundColor: palette.toastBg, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, gap: 4, minWidth: 148 }}>
      <AppText variant="label" color="onPrimary">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: palette.incomeOnHero }} />
        <AppText variant="caption" style={{ color: palette.incomeOnHero }}>
          {t('transactions.income')} {formatRupees(incomePaise, 'neutral', false)}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: palette.expenseOnHero }} />
        <AppText variant="caption" style={{ color: palette.expenseOnHero }}>
          {t('transactions.expense')} {formatRupees(expensePaise, 'neutral', false)}
        </AppText>
      </View>
    </View>
  );
}

export function ReportsScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ReportsRoute>();
  const userId = useActiveUserId();
  const language = useSettingsStore((s) => s.language);
  const categoriesById = useCategoriesById(userId);

  const [period, setPeriod] = useState<ReportPeriod>(route.params?.period ?? 'month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [customRange, setCustomRange] = useState<DateRange | undefined>(
    route.params?.period === 'custom' && route.params.from && route.params.to
      ? { from: route.params.from, to: route.params.to }
      : undefined,
  );

  useEffect(() => {
    if (!route.params?.period) return;
    if (route.params.period === 'custom' && route.params.from && route.params.to) {
      setPeriod('custom');
      setCustomRange({ from: route.params.from, to: route.params.to });
    } else {
      setPeriod(route.params.period);
      setAnchor(new Date());
    }
  }, [route.params]);

  const data = useLiveQuery(
    ['transactions'],
    () => {
      const range = getPeriodRange(period, anchor, customRange);
      const trend = trendBuckets(period, range, language);
      const expenseBreakdown = reportsRepo.categoryBreakdown(userId, range, 'expense');
      return {
        range,
        totalCount: reportsRepo.totalTransactionCount(userId),
        summary: transactionsRepo.summary({ userId, from: range.from, to: range.to }),
        trend,
        incomeTrendValues: reportsRepo.incomeTrend(userId, trend),
        expenseTrendValues: reportsRepo.expenseTrend(userId, trend),
        expenseBreakdown,
        paymentBreakdown: reportsRepo.paymentMethodBreakdown(userId, range, 'income'),
      };
    },
    [userId, period, anchor, customRange, language],
  );

  if (data.totalCount < 3) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <AppText variant="title">{t('reports.title')}</AppText>
        </View>
        <EmptyState
          icon={PieChartIcon}
          title={t('empty.reports.title')}
          body={t('empty.reports.body')}
          actions={[{ label: t('empty.reports.add'), onPress: () => openAddSheet() }]}
        />
      </SafeAreaView>
    );
  }

  const hasPeriodData = data.summary.incomePaise > 0 || data.summary.expensePaise > 0;
  const net = data.summary.netPaise;
  const keptPct = data.summary.incomePaise > 0 ? Math.max(0, Math.round((net / data.summary.incomePaise) * 100)) : 0;
  const heroLabel = heroPeriodLabel(period, anchor, language, t);
  const current = isCurrentPeriod(period, anchor);
  // A year's worth of daily trend points needs horizontal scroll and sparser labels than a week's.
  const trendScrollable = data.trend.length > 31;
  const trendLabelEvery = Math.max(1, Math.ceil(data.trend.length / 8));

  const selectChip = (p: ReportPeriod) => {
    if (p === 'custom') {
      navigation.navigate('CustomRange');
      return;
    }
    setPeriod(p);
    setAnchor(new Date());
    setCustomRange(undefined);
  };

  const totalExpense = data.expenseBreakdown.reduce((s, r) => s + r.amountPaise, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="title">{t('reports.title')}</AppText>
            <IconButton outlined icon={Calendar} accessibilityLabel={t('reports.calendarTitle')} onPress={() => navigation.navigate('FinancialCalendar')} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {PERIOD_CHIPS.map((chip) => (
              <Chip key={chip.value} label={t(chip.labelKey)} selected={period === chip.value} onPress={() => selectChip(chip.value)} />
            ))}
            <Chip label={t('reports.custom')} selected={period === 'custom'} onPress={() => selectChip('custom')} />
          </ScrollView>

          {period !== 'custom' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <IconButton outlined icon={ChevronLeft} accessibilityLabel={t('common.previous')} onPress={() => setAnchor(stepAnchor(period, anchor, -1))} />
              <AppText variant="section">{periodLabel(period, anchor, language)}</AppText>
              <IconButton
                outlined
                icon={ChevronRight}
                accessibilityLabel={t('common.next')}
                color={current ? palette.textTertiary : undefined}
                onPress={current ? undefined : () => setAnchor(stepAnchor(period, anchor, 1))}
              />
            </View>
          ) : null}

          <GradientSurface variant="hero" style={{ borderRadius: radius.heroCard, padding: 18, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
              <View>
                <AppText variant="label" style={{ color: palette.textOnHeroMuted }}>
                  {t('reports.net', { period: heroLabel })}
                </AppText>
                <AppText variant="amountXL" color="onPrimary">
                  {formatRupees(net, 'net')}
                </AppText>
              </View>
              <AppText variant="secondary" style={{ color: palette.textOnHeroMuted, textAlign: 'right', maxWidth: 140 }}>
                {net >= 0
                  ? t('reports.keptPct', { pct: keptPct })
                  : t('reports.spentMore', { amount: formatRupees(Math.abs(net), 'neutral', false) })}
              </AppText>
            </View>

            <View
              style={{
                marginTop: 18,
                borderRadius: 18,
                backgroundColor: palette.statsOnHero,
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: 'row',
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <ArrowDownLeft size={14} color={palette.textOnHeroMuted} strokeWidth={2.5} />
                  <AppText variant="label" style={{ color: palette.textOnHeroMuted }}>
                    {t('transactions.income')}
                  </AppText>
                </View>
                <AppText variant="amountHeroStat" style={{ color: palette.incomeOnHero }}>
                  {formatRupees(data.summary.incomePaise, 'neutral', false)}
                </AppText>
              </View>
              <View style={{ width: 1, backgroundColor: palette.dividerOnHero, marginHorizontal: 4 }} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <ArrowUpRight size={14} color={palette.textOnHeroMuted} strokeWidth={2.5} />
                  <AppText variant="label" style={{ color: palette.textOnHeroMuted }}>
                    {t('transactions.expense')}
                  </AppText>
                </View>
                <AppText variant="amountHeroStat" style={{ color: palette.expenseOnHero }}>
                  {formatRupees(data.summary.expensePaise, 'neutral', false)}
                </AppText>
              </View>
            </View>
          </GradientSurface>

          <Card>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="section">{t('reports.incomeVsExpense')}</AppText>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.income }} />
                    <AppText variant="caption" color="secondary">
                      {t('transactions.income')}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.expenseChart }} />
                    <AppText variant="caption" color="secondary">
                      {t('transactions.expense')}
                    </AppText>
                  </View>
                </View>
              </View>
              <BarChart
                data={data.trend.flatMap((b, i) => [
                  { value: data.incomeTrendValues[i] / 100, frontColor: palette.income, spacing: 2 },
                  {
                    value: data.expenseTrendValues[i] / 100,
                    frontColor: palette.expenseChart,
                    spacing: 16,
                    label: i % trendLabelEvery === 0 ? b.label : '',
                    labelTextStyle: { color: palette.textPrimary, fontSize: 11, fontWeight: i === data.trend.length - 1 ? ('800' as const) : ('500' as const) },
                  },
                ])}
                barWidth={12}
                barBorderRadius={4}
                roundedTop
                height={150}
                overflowTop={70}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={palette.border}
                hideYAxisText
                hideRules
                labelWidth={34}
                noOfSections={4}
                initialSpacing={10}
                disableScroll={!trendScrollable}
                renderTooltip={(_item: unknown, index: number) => {
                  const bucketIndex = Math.floor(index / 2);
                  const bucket = data.trend[bucketIndex];
                  if (!bucket) return null;
                  return (
                    <ChartTooltip
                      label={bucket.label}
                      incomePaise={data.incomeTrendValues[bucketIndex]}
                      expensePaise={data.expenseTrendValues[bucketIndex]}
                      palette={palette}
                      t={t}
                    />
                  );
                }}
                autoCenterTooltip
              />
            </View>
          </Card>

          {hasPeriodData ? (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ gap: 4 }}>
                  <AppText variant="section">{t('reports.incomeTrend')}</AppText>
                  <AppText variant="caption" color="secondary">
                    {t('reports.weeklyIncome', { month: heroLabel })}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.income }} />
                    <AppText variant="caption" color="secondary">
                      {t('transactions.income')}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.expenseChart }} />
                    <AppText variant="caption" color="secondary">
                      {t('transactions.expense')}
                    </AppText>
                  </View>
                </View>
              </View>
              <LineChart
                data={data.trend.map((b, i) => ({
                  value: data.incomeTrendValues[i] / 100,
                  // Thin labels to ~8 evenly-spaced points — a year's worth of days would otherwise overlap.
                  label: i % trendLabelEvery === 0 ? b.label : '',
                }))}
                data2={data.trend.map((_, i) => ({ value: data.expenseTrendValues[i] / 100 }))}
                color={palette.income}
                color2={palette.expenseChart}
                thickness={3}
                thickness2={3}
                curved
                areaChart
                startFillColor={palette.incomeTint}
                endFillColor={palette.incomeTint}
                startOpacity={0.9}
                endOpacity={0.1}
                dataPointsColor={palette.income}
                dataPointsColor2={palette.expenseChart}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={palette.border}
                hideYAxisText
                hideRules
                noOfSections={3}
                height={130}
                overflowTop={16}
                initialSpacing={20}
                endSpacing={20}
                spacing={trendScrollable ? 18 : undefined}
                disableScroll={!trendScrollable}
                pointerConfig={{
                  pointerStripHeight: 130,
                  pointerStripColor: palette.border,
                  pointerColor: palette.textPrimary,
                  radius: 5,
                  activatePointersInstantlyOnTouch: true,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelWidth: 148,
                  pointerLabelHeight: 90,
                  pointerLabelComponent: (items: Array<{ value?: number }>, _secondary: Array<{ value?: number }>, pointerIndex: number) => {
                    const bucket = data.trend[pointerIndex];
                    if (!bucket) return null;
                    return (
                      <ChartTooltip
                        label={bucket.label}
                        incomePaise={data.incomeTrendValues[pointerIndex]}
                        expensePaise={data.expenseTrendValues[pointerIndex]}
                        palette={palette}
                        t={t}
                      />
                    );
                  },
                }}
              />
            </Card>
          ) : null}

          {hasPeriodData && data.expenseBreakdown.length > 0 ? (
            <Card>
              <View style={{ gap: 12 }}>
                <AppText variant="section">{t('reports.whereSpent')}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 132, height: 132 }}>
                    <PieChart
                      data={data.expenseBreakdown.map((row, i) => ({ value: row.amountPaise, color: chartColors[i % chartColors.length] }))}
                      donut
                      radius={66}
                      innerRadius={46}
                      innerCircleColor={palette.surface}
                      centerLabelComponent={() => (
                        <View style={{ alignItems: 'center' }}>
                          <AppText variant="caption" color="secondary">
                            {t('reports.total')}
                          </AppText>
                          <AppText variant="rowTitle">{formatCompact(totalExpense)}</AppText>
                        </View>
                      )}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    {data.expenseBreakdown.slice(0, 5).map((row, i) => {
                      const category = categoriesById[row.categoryId];
                      const name = category ? categoryDisplayName(category, language) : '';
                      return (
                        <View key={row.categoryId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: chartColors[i % chartColors.length] }} />
                          <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                            {name}
                          </AppText>
                          <AppText variant="rowTitle">{Math.round(row.share * 100)}%</AppText>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <Button
                  label={t('reports.seeAllCategories')}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => navigation.navigate('ReportDetail', { period, anchor: toOccurredOn(anchor), type: 'expense' })}
                />
              </View>
            </Card>
          ) : null}

          {hasPeriodData && data.paymentBreakdown.length > 0 ? (
            <Card>
              <View style={{ gap: 12 }}>
                <View>
                  <AppText variant="section">{t('reports.paymentMethods')}</AppText>
                  <AppText variant="caption" color="secondary">
                    {t('reports.receivedIn', { period: heroLabel })}
                  </AppText>
                </View>
                {data.paymentBreakdown.map((row) => (
                  <View key={row.paymentMethod} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <AppText variant="rowTitle">{t(`payment.${row.paymentMethod}`)}</AppText>
                      <AppText variant="body">
                        {formatRupees(row.amountPaise, 'neutral', false)}{' '}
                        <AppText variant="caption" color="secondary">
                          · {Math.round(row.share * 100)}%
                        </AppText>
                      </AppText>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.muted, overflow: 'hidden' }}>
                      <View style={{ height: 6, borderRadius: 3, width: `${Math.round(row.share * 100)}%`, backgroundColor: palette.primary }} />
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {!hasPeriodData ? (
            <AppText variant="body" color="secondary" style={{ textAlign: 'center', paddingVertical: 24 }}>
              {t('reports.noDataPeriod')}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
