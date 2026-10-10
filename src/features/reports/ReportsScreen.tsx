import React, { useEffect, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { generatePDF } from 'react-native-html-to-pdf';
import { Calendar, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, PieChart as PieChartIcon } from 'lucide-react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { AppText } from '../../components/common/AppText';
import { IconButton } from '../../components/common/IconButton';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { GradientSurface } from '../../components/common/GradientSurface';
import { EmptyState } from '../../components/common/EmptyState';
import { AdSlot } from '../../components/common/AdSlot';
import { useLeaveReportsInterstitial } from './useLeaveReportsInterstitial';
import { Button } from '../../components/common/Button';
import { ExportMenu } from '../../components/common/ExportMenu';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useCategoriesById } from '../../hooks/useCategories';
import { useSettingsStore } from '../../store/settingsStore';
import { openAddSheet } from '../../store/addSheetStore';
import { showToast } from '../../store/toastStore';
import * as reportsRepo from '../../database/repositories/reportsRepo';
import * as transactionsRepo from '../../database/repositories/transactionsRepo';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import { getPeriodRange, stepAnchor, isCurrentPeriod, periodLabel, trendBuckets } from './periods';
import { toOccurredOn } from '../../utils/dates';
import { formatRupees, formatCompact } from '../../utils/money';
import { radius, chartColors, layout, palette as themePalettes } from '../../theme/tokens';
import { useEntitlement } from '../subscription/useEntitlement';
import { bytesToBase64 } from '../../utils/base64';
import { buildXlsx } from '../../services/export/xlsx';
import { buildStatementHtml } from '../../services/export/pdfHtml';
import { buildSpendingHtml, sliceColor } from '../../services/export/spendingPdf';
import { buildIncomeExpenseHtml } from '../../services/export/chartPdf';
import { saveToDownloads, writeCacheFile } from '../../services/export/saveToDownloads';
import type { Table } from '../../services/export/rows';
import type { AppStackParamList, MainTabParamList } from '../../app/navigation/types';
import type { DateRange, ReportPeriod } from '../../types/models';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type ReportsRoute = RouteProp<MainTabParamList, 'Reports'>;
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type ChartExport = 'spend' | 'bars' | 'trend';
/** PDFs print on white paper — always the light palette, whatever theme the app is in. */
const PDF_COLORS = { income: themePalettes.light.income, expense: themePalettes.light.expenseChart };

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

/** Compact amount shown above a bar in the Income vs Expense chart — hidden for zero-value bars. */
function BarValueLabel({ paise, color }: { paise: number; color: string }) {
  if (paise <= 0) return null;
  return (
    <AppText variant="caption" style={{ color, fontSize: 10 }}>
      {formatCompact(paise)}
    </AppText>
  );
}

export function ReportsScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const { width: windowWidth } = useWindowDimensions();
  // Available plot width inside the card: screen padding and the card's own padding on both sides.
  const trendChartWidth = windowWidth - (layout.screenPadding + layout.cardPadding) * 2;
  useLeaveReportsInterstitial();
  // Which day (index into data.trend) is selected in the Income vs Expense bar chart — shown as a
  // fixed in-card tooltip instead of gifted-charts' own bar-height-relative popup, which clips
  // against the card's top edge for tall bars.
  const [selectedBarDay, setSelectedBarDay] = useState<number | null>(null);
  // Same fixed in-card approach for the trend line chart — the library's own floating pointer label
  // renders off the edge of the screen for the first/last point instead of staying in view.
  const [selectedTrendDay, setSelectedTrendDay] = useState<number | null>(null);
  const { isPremium } = useEntitlement();
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'excel' | null>(null);
  const [exportingChart, setExportingChart] = useState<ChartExport | null>(null);
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

  // A stale selection could otherwise point at a different day's data once the period/anchor changes.
  useEffect(() => {
    setSelectedBarDay(null);
    setSelectedTrendDay(null);
  }, [period, anchor, customRange]);

  // These tooltips are shown via local state (so they can't render off-screen the way gifted-charts'
  // own floating pointer label can) but that means nothing else auto-clears them on touch release —
  // without this they'd stay up until the period changes.
  useEffect(() => {
    if (selectedBarDay === null) return;
    const timer = setTimeout(() => setSelectedBarDay(null), 3000);
    return () => clearTimeout(timer);
  }, [selectedBarDay]);

  useEffect(() => {
    if (selectedTrendDay === null) return;
    const timer = setTimeout(() => setSelectedTrendDay(null), 3000);
    return () => clearTimeout(timer);
  }, [selectedTrendDay]);

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
  // Income vs Expense bar chart: skip buckets with no income and no expense rather than
  // rendering an empty, unlabeled day-group.
  const barChartDays = data.trend
    .map((b, i) => ({ b, i }))
    .filter(({ i }) => data.incomeTrendValues[i] > 0 || data.expenseTrendValues[i] > 0);

  const dailyTable: Table = {
    title: t('reports.dailyBreakdown'),
    header: [t('reports.colDate'), t('reports.colIncome'), t('reports.colExpense'), t('reports.colNet')],
    rows: barChartDays.map(({ b, i }) => [
      { text: b.label },
      { text: formatRupees(data.incomeTrendValues[i], 'neutral', false) },
      { text: formatRupees(data.expenseTrendValues[i], 'neutral', false) },
      { text: formatRupees(data.incomeTrendValues[i] - data.expenseTrendValues[i], 'net') },
    ]),
  };

  /** Daily breakdown export (SCREENS.md §19c rules: PDF/Excel are Premium, free users are sent to Premium). */
  const handleExportDaily = async (format: 'pdf' | 'excel') => {
    if (!isPremium) {
      navigation.navigate('Premium');
      return;
    }
    setExportingFormat(format);
    try {
      const stem = `apna-hisab-daily-breakdown_${data.range.from}_${data.range.to}`;
      if (format === 'excel') {
        const xlsx = buildXlsx([dailyTable]);
        // MediaStore needs an existing local file to copy from, not raw bytes — write it to the
        // app's private cache first, then copy that into the Downloads collection below.
        const cachePath = await writeCacheFile(`${stem}.xlsx`, bytesToBase64(xlsx));
        await saveToDownloads(cachePath, `${stem}.xlsx`, EXCEL_MIME);
      } else {
        const html = buildStatementHtml({
          title: dailyTable.title,
          rangeLabel: periodLabel(period, anchor, language),
          generatedLabel: t('export.generatedOn', { date: periodLabel('today', new Date(), language) }),
          totals: [
            { label: t('transactions.income'), paise: data.summary.incomePaise, kind: 'income' },
            { label: t('transactions.expense'), paise: data.summary.expensePaise, kind: 'expense' },
            { label: t('reports.netLabel'), paise: net, kind: 'net' },
          ],
          tables: [dailyTable],
        });
        const pdf = await generatePDF({ html, fileName: stem, width: 595, height: 842, directory: 'Documents' });
        await saveToDownloads(pdf.filePath, `${stem}.pdf`, 'application/pdf');
      }
      showToast({ message: t('toast.savedToDownloads') });
    } catch {
      showToast({ message: t('export.failed') });
    } finally {
      setExportingFormat(null);
    }
  };


  /** "Export as PDF" on the three charts — PDF is Premium, like every PDF/Excel export (SCREENS.md §19c). */
  const handleExportChart = async (chart: ChartExport) => {
    if (!isPremium) {
      navigation.navigate('Premium');
      return;
    }
    setExportingChart(chart);
    try {
      const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
      const rangeLabel = periodLabel(period, anchor, language, customRange);
      const generatedLabel = t('export.generatedOn', { date: periodLabel('today', new Date(), language) });
      let title: string;
      let html: string;
      if (chart === 'spend') {
        title = t('reports.whereSpent');
        html = buildSpendingHtml({
          title,
          rangeLabel,
          generatedLabel,
          totalLabel: t('reports.total'),
          columns: { category: t('export.colCategory'), amount: t('export.colAmount'), share: t('export.colShare') },
          slices: data.expenseBreakdown.map((row, i) => {
            const category = categoriesById[row.categoryId];
            return {
              label: category ? categoryDisplayName(category, language) : '',
              amountPaise: row.amountPaise,
              share: row.share,
              color: sliceColor(i, chartColors),
            };
          }),
        });
      } else {
        title = chart === 'bars' ? t('reports.incomeVsExpense') : t('reports.incomeTrend');
        html = buildIncomeExpenseHtml({
          kind: chart,
          title,
          rangeLabel,
          generatedLabel,
          labels: { income: t('transactions.income'), expense: t('transactions.expense'), net: t('reports.colNet'), date: t('reports.colDate') },
          colors: PDF_COLORS,
          // The same days the on-screen charts plot.
          points: barChartDays.map(({ b, i }) => ({
            label: b.label,
            day: b.hour === undefined ? b.range.from : undefined,
            incomePaise: data.incomeTrendValues[i],
            expensePaise: data.expenseTrendValues[i],
          })),
          monthLabel: (yyyyMm) => new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(new Date(`${yyyyMm}-01T00:00:00`)),
        });
      }
      const stem = `apna-hisab-${chart === 'spend' ? 'spending' : chart === 'bars' ? 'income-vs-expense' : 'trend'}_${data.range.from}_${data.range.to}`;
      const pdf = await generatePDF({ html, fileName: stem, width: 595, height: 842, directory: 'Documents' });
      await saveToDownloads(pdf.filePath, `${stem}.pdf`, 'application/pdf');
      showToast({ message: t('toast.savedToDownloads') });
    } catch {
      showToast({ message: t('export.failed') });
    } finally {
      setExportingChart(null);
    }
  };

  const exportChartMenu = (chart: ChartExport) => (
    <ExportMenu
      busy={exportingChart === chart}
      items={[{ label: t('reports.exportPdf'), icon: FileText, onPress: () => handleExportChart(chart) }]}
    />
  );

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

          {hasPeriodData && data.expenseBreakdown.length > 0 ? (
            <Card>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <AppText variant="section" style={{ flexShrink: 1 }}>
                    {t('reports.whereSpent')}
                  </AppText>
                  {exportChartMenu('spend')}
                </View>
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
                          <AppText variant="rowTitle">
                            {formatRupees(row.amountPaise, 'neutral', false)} ({Math.round(row.share * 100)}%)
                          </AppText>
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

          <Card>
            <View style={{ gap: 12, position: 'relative' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <AppText variant="section" style={{ flexShrink: 1 }}>
                  {t('reports.incomeVsExpense')}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                  {barChartDays.length > 0 ? exportChartMenu('bars') : null}
                </View>
              </View>
              {/* Absolutely positioned over the chart instead of taking its own flow space, so the
                  chart doesn't shift position when the tooltip appears/disappears. */}
              {selectedBarDay !== null ? (
                <View style={{ position: 'absolute', top: 36, left: 0, right: 0, zIndex: 10 }}>
                  <ChartTooltip
                    label={data.trend[selectedBarDay].label}
                    incomePaise={data.incomeTrendValues[selectedBarDay]}
                    expensePaise={data.expenseTrendValues[selectedBarDay]}
                    palette={palette}
                    t={t}
                  />
                </View>
              ) : null}
              <BarChart
                data={barChartDays.flatMap(({ b, i }, order) => [
                  {
                    value: data.incomeTrendValues[i] / 100,
                    frontColor: palette.income,
                    spacing: 4,
                    topLabelComponent: () => <BarValueLabel paise={data.incomeTrendValues[i]} color={palette.income} />,
                  },
                  {
                    value: data.expenseTrendValues[i] / 100,
                    frontColor: palette.expenseChart,
                    spacing: 22,
                    label: b.label,
                    labelTextStyle: {
                      color: palette.textPrimary,
                      fontSize: 11,
                      fontWeight: order === barChartDays.length - 1 ? ('800' as const) : ('500' as const),
                      transform: [{ rotate: '-20deg' }],
                    },
                    topLabelComponent: () => <BarValueLabel paise={data.expenseTrendValues[i]} color={palette.expenseChart} />,
                  },
                ])}
                barWidth={36}
                barBorderRadius={0}
                height={150}
                overflowTop={90}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={palette.border}
                hideYAxisText
                hideRules
                labelWidth={34}
                noOfSections={4}
                initialSpacing={10}
                disableScroll={false}
                labelsExtraHeight={22}
                onPress={(_item: unknown, index: number) => {
                  const day = barChartDays[Math.floor(index / 2)];
                  setSelectedBarDay(day ? day.i : null);
                }}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                  {exportChartMenu('trend')}
                </View>
              </View>
              {/* Absolutely positioned over the chart instead of taking its own flow space, so the
                  chart doesn't shift position when the tooltip appears/disappears. */}
              {selectedTrendDay !== null ? (
                <View style={{ position: 'absolute', top: 68, left: 0, right: 0, zIndex: 10 }}>
                  <ChartTooltip
                    label={data.trend[selectedTrendDay]?.label ?? ''}
                    incomePaise={data.incomeTrendValues[selectedTrendDay]}
                    expensePaise={data.expenseTrendValues[selectedTrendDay]}
                    palette={palette}
                    t={t}
                  />
                </View>
              ) : null}
              <View>
                <LineChart
                // adjustToWidth's `width` prop turned out not to pull the last point in from the
                // true edge no matter how small a value was passed (tested down to far less than the
                // card's width), so its label was always clipped. A trailing invisible point (same
                // value, empty label, hidden marker) pushes the real last point — and its label — one
                // slot away from the edge instead, which reliably works regardless of that mystery.
                data={[
                  ...barChartDays.map(({ b, i }) => ({
                    value: data.expenseTrendValues[i] / 100,
                    label: b.label,
                  })),
                  {
                    value: data.expenseTrendValues[barChartDays[barChartDays.length - 1]?.i ?? 0] / 100,
                    label: '',
                    hideDataPoint: true,
                  },
                ]}
                data2={[
                  ...barChartDays.map(({ i }) => ({ value: data.incomeTrendValues[i] / 100 })),
                  { value: data.incomeTrendValues[barChartDays[barChartDays.length - 1]?.i ?? 0] / 100, hideDataPoint: true },
                ]}
                color={palette.expenseChart}
                color2={palette.income}
                thickness={3}
                thickness2={3}
                dataPointsColor={palette.expenseChart}
                dataPointsColor2={palette.income}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={palette.border}
                hideYAxisText
                hideRules
                noOfSections={3}
                height={130}
                overflowTop={16}
                // This chart renders its own absolutely-positioned box, so a wrapping View's padding
                // doesn't constrain it — margin has to come from the chart's own coordinate math
                // instead. With adjustToWidth, the last point always lands exactly at `width` and the
                // first always at `initialSpacing`, so both are pulled in by 24px directly.
                initialSpacing={24}
                endSpacing={24}
                // Spreads the (few, filtered-to-non-zero-days) points evenly across the full
                // available card width instead of bunching them at a fixed spacing on the left.
                adjustToWidth
                width={trendChartWidth - 140}
                disableScroll={false}
                // Unlike the bar chart, this library widens each label's own box by
                // labelsExtraHeight without shifting its left edge to compensate — passing it here
                // visibly shifts every rotated label off-center from its real data point, so it's
                // deliberately left out; the existing label row has enough clearance for a -20deg tilt.
                xAxisLabelTextStyle={{ color: palette.textPrimary, fontSize: 11, transform: [{ rotate: '-20deg' }] }}
                pointerConfig={{
                  pointerStripHeight: 130,
                  pointerStripColor: palette.border,
                  pointerColor: palette.textPrimary,
                  radius: 5,
                  activatePointersInstantlyOnTouch: true,
                  // Drives the fixed in-card tooltip above instead of gifted-charts' own floating
                  // pointer label, which renders off the edge of the screen for the first/last point
                  // rather than staying in view. Touch still shows the strip + highlighted dot.
                  pointerLabelComponent: (_items: unknown, _secondary: unknown, pointerIndex: number) => {
                    setSelectedTrendDay(barChartDays[pointerIndex]?.i ?? null);
                    return null;
                  },
                }}
                />
              </View>
            </Card>
          ) : null}

          {barChartDays.length > 0 ? (
            <Card padded={false} style={{ paddingVertical: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  marginBottom: 12,
                }}
              >
                <AppText variant="section">{t('reports.dailyBreakdown')}</AppText>
                <ExportMenu
                  busy={exportingFormat !== null}
                  accessibilityLabel={t('reports.exportPremium')}
                  items={[
                    { label: t('reports.exportPdf'), icon: FileText, onPress: () => handleExportDaily('pdf') },
                    { label: t('reports.exportExcel'), icon: FileSpreadsheet, onPress: () => handleExportDaily('excel') },
                  ]}
                />
              </View>
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8 }}>
                <AppText variant="caption" color="secondary" style={{ flex: 1.1 }}>
                  {t('reports.colDate')}
                </AppText>
                <AppText variant="caption" color="secondary" style={{ flex: 1, textAlign: 'right' }}>
                  {t('reports.colIncome')}
                </AppText>
                <AppText variant="caption" color="secondary" style={{ flex: 1, textAlign: 'right' }}>
                  {t('reports.colExpense')}
                </AppText>
                <AppText variant="caption" color="secondary" style={{ flex: 1, textAlign: 'right' }}>
                  {t('reports.colNet')}
                </AppText>
              </View>
              {barChartDays.map(({ b, i }, order) => {
                const incomePaise = data.incomeTrendValues[i];
                const expensePaise = data.expenseTrendValues[i];
                return (
                  <View
                    key={b.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderTopWidth: order === 0 ? 0 : 1,
                      borderTopColor: palette.border,
                    }}
                  >
                    <AppText variant="body" style={{ flex: 1.1 }}>
                      {b.label}
                    </AppText>
                    <AppText variant="body" style={{ flex: 1, textAlign: 'right', color: palette.income }}>
                      {formatRupees(incomePaise, 'neutral', false)}
                    </AppText>
                    <AppText variant="body" style={{ flex: 1, textAlign: 'right', color: palette.expenseChart }}>
                      {formatRupees(expensePaise, 'neutral', false)}
                    </AppText>
                    <AppText variant="body" style={{ flex: 1, textAlign: 'right' }}>
                      {formatRupees(incomePaise - expensePaise, 'net')}
                    </AppText>
                  </View>
                );
              })}
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

          {hasPeriodData ? <AdSlot placement="reports_below_charts" /> : null}

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
