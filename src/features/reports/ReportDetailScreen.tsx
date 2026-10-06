import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Download } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { DynamicIcon } from '../../components/common/DynamicIcon';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useCategoriesById } from '../../hooks/useCategories';
import { useSettingsStore } from '../../store/settingsStore';
import * as reportsRepo from '../../database/repositories/reportsRepo';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import { getPeriodRange, periodLabel } from './periods';
import { formatRupees } from '../../utils/money';
import { chartColors } from '../../theme/tokens';
import type { AppStackParamList } from '../../app/navigation/types';
import type { TransactionType } from '../../types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'ReportDetail'>;

export function ReportDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const palette = useTheme();
  const userId = useActiveUserId();
  const language = useSettingsStore((s) => s.language);
  const categoriesById = useCategoriesById(userId);
  const { period, anchor: anchorIso } = route.params;

  const [type, setType] = useState<TransactionType>(route.params.type);

  const anchor = new Date(`${anchorIso}T00:00:00`);
  const range = getPeriodRange(period, anchor);

  const breakdown = useLiveQuery(
    ['transactions'],
    () => ({
      expense: reportsRepo.categoryBreakdown(userId, range, 'expense'),
      income: reportsRepo.categoryBreakdown(userId, range, 'income'),
    }),
    [userId, range.from, range.to],
  );

  const rows = breakdown[type];
  const expenseTotal = breakdown.expense.reduce((s, r) => s + r.amountPaise, 0);
  const incomeTotal = breakdown.income.reduce((s, r) => s + r.amountPaise, 0);
  const tint = type === 'income' ? palette.incomeTint : palette.expenseTint;
  const fg = type === 'income' ? palette.income : palette.expense;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
        <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText variant="titlePushed" numberOfLines={1}>
            {t('reports.breakdownTitle')}
          </AppText>
          <AppText variant="caption" color="secondary">
            {periodLabel(period, anchor, language)}
          </AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <SegmentedControl
          value={type}
          onChange={(v) => setType(v as TransactionType)}
          segments={[
            { value: 'expense', label: `${t('transactions.expense')} ${formatRupees(expenseTotal, 'neutral', false)}`, color: 'expense' },
            { value: 'income', label: `${t('transactions.income')} ${formatRupees(incomeTotal, 'neutral', false)}`, color: 'income' },
          ]}
        />

        {rows.length === 0 ? (
          <AppText variant="body" color="secondary" style={{ textAlign: 'center', paddingVertical: 32 }}>
            {t('reports.noDataPeriod')}
          </AppText>
        ) : (
          <Card padded={false} style={{ marginTop: 14 }}>
            {rows.map((row, i) => {
              const category = categoriesById[row.categoryId];
              const name = category ? categoryDisplayName(category, language) : '';
              const icon = category?.icon ?? 'LayoutGrid';
              const barColor = chartColors[i % chartColors.length];
              const pct = Math.round(row.share * 100);

              return (
                <Pressable
                  key={row.categoryId}
                  accessibilityRole="button"
                  accessibilityLabel={`${name}, ${pct}%, ${formatRupees(row.amountPaise, 'neutral', false)}`}
                  onPress={() =>
                    navigation.navigate('MainTabs', {
                      screen: 'Transactions',
                      params: { categoryIds: [row.categoryId], from: range.from, to: range.to },
                    })
                  }
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                    borderBottomColor: palette.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
                      <DynamicIcon name={icon} size={20} color={fg} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="rowTitle" numberOfLines={1}>
                        {name}
                      </AppText>
                      <AppText variant="secondary" color="secondary">
                        {t(row.count === 1 ? 'reports.breakdownRow_one' : 'reports.breakdownRow_other', { pct, count: row.count })}
                      </AppText>
                    </View>
                    <AppText variant="rowTitle">{formatRupees(row.amountPaise, 'neutral', false)}</AppText>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.muted, overflow: 'hidden', marginTop: 8 }}>
                    <View style={{ height: 6, borderRadius: 3, width: `${pct}%`, backgroundColor: barColor }} />
                  </View>
                </Pressable>
              );
            })}
          </Card>
        )}

        {rows.length > 0 ? (
          <AppText variant="caption" color="secondary" style={{ textAlign: 'center', marginTop: 14 }}>
            {t('reports.tapCategory')}
          </AppText>
        ) : null}

        <View style={{ marginTop: 24 }}>
          <Button label={t('reports.exportPremium')} variant="secondary" icon={Download} onPress={() => navigation.navigate('Premium')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
