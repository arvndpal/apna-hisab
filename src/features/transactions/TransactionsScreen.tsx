import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, Filter, List } from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { AppText } from '../../components/common/AppText';
import { IconButton } from '../../components/common/IconButton';
import { SearchBar } from '../../components/common/SearchBar';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { AdSlot } from '../../components/common/AdSlot';
import { EmptyState } from '../../components/common/EmptyState';
import { TransactionList, groupByDay } from '../../components/transactions/TransactionList';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useCategories, useCategoriesById } from '../../hooks/useCategories';
import { useDebounce } from '../../hooks/useDebounce';
import * as transactionsRepo from '../../database/repositories/transactionsRepo';
import { toOccurredOn } from '../../utils/dates';
import { TransactionFiltersSheet, EMPTY_FILTERS, type TxnFilters } from './TransactionFilters';
import type { AppStackParamList, MainTabParamList } from '../../app/navigation/types';
import type { TransactionType } from '../../types/models';

function dateRangeFor(preset: TxnFilters['datePreset']): { from?: string; to?: string } {
  const today = new Date();
  const to = toOccurredOn(today);
  if (preset === 'today') return { from: to, to };
  if (preset === 'week') {
    const day = (today.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(today);
    monday.setDate(today.getDate() - day);
    return { from: toOccurredOn(monday), to };
  }
  if (preset === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toOccurredOn(first), to };
  }
  return {};
}

export function TransactionsScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Transactions'>>();
  const userId = useActiveUserId();
  const categoriesById = useCategoriesById(userId);
  const allCategories = useCategories(userId);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [filters, setFilters] = useState<TxnFilters>(EMPTY_FILTERS);
  // An exact [from, to] range handed in via route params (e.g. from a report's category drill-down) —
  // takes priority over the filter sheet's relative `datePreset` chips, which can't express it.
  const [explicitRange, setExplicitRange] = useState<{ from?: string; to?: string } | null>(null);
  const filtersSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (!route.params) return;
    setFilters((f) => ({ ...f, categoryIds: route.params?.categoryIds ?? f.categoryIds }));
    if (route.params.from || route.params.to) {
      setExplicitRange({ from: route.params.from, to: route.params.to });
    }
  }, [route.params]);

  const hasActiveFilters = filters.datePreset !== null || filters.categoryIds.length > 0 || filters.paymentMethods.length > 0 || filters.minPaise != null || filters.maxPaise != null;

  const buildParams = (f: TxnFilters) => ({
    userId,
    search: debouncedSearch || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
    ...(explicitRange ?? dateRangeFor(f.datePreset)),
    categoryIds: f.categoryIds.length ? f.categoryIds : undefined,
    paymentMethods: f.paymentMethods.length ? f.paymentMethods : undefined,
    minPaise: f.minPaise ?? undefined,
    maxPaise: f.maxPaise ?? undefined,
  });

  const transactions = useLiveQuery(
    ['transactions'],
    () => transactionsRepo.list(buildParams(filters)),
    [userId, debouncedSearch, typeFilter, filters],
  );

  const sections = useMemo(() => groupByDay(transactions, t), [transactions, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="title">{t('transactions.title')}</AppText>
          <IconButton outlined icon={Calendar} accessibilityLabel={t('reports.calendarTitle')} onPress={() => navigation.navigate('FinancialCalendar')} />
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder={t('transactions.searchPlaceholder')} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SegmentedControl
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as 'all' | TransactionType)}
              segments={[
                { value: 'all', label: t('transactions.all') },
                { value: 'income', label: t('transactions.income'), color: 'income' },
                { value: 'expense', label: t('transactions.expense'), color: 'expense' },
              ]}
            />
          </View>
          <View>
            <IconButton outlined icon={Filter} accessibilityLabel={t('filters.title')} color={hasActiveFilters ? palette.primary : undefined} onPress={() => filtersSheetRef.current?.present()} />
            {hasActiveFilters ? (
              <View style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary }} />
            ) : null}
          </View>
        </View>
      </View>

      {transactions.length === 0 ? (
        <EmptyState
          icon={List}
          title={search ? t('empty.search.title') : t('empty.transactions.title')}
          body={search ? t('empty.search.body', { query: search }) : t('empty.transactions.body')}
          actions={
            search
              ? [{ label: t('empty.search.clear'), variant: 'secondary', onPress: () => { setSearch(''); setFilters(EMPTY_FILTERS); } }]
              : [
                  { label: t('empty.transactions.addIncome'), variant: 'incomeTonal', onPress: () => navigation.navigate('AddTransaction', { type: 'income' }) },
                  { label: t('empty.transactions.addExpense'), variant: 'expenseTonal', onPress: () => navigation.navigate('AddTransaction', { type: 'expense' }) },
                ]
          }
        />
      ) : (
        <TransactionList
          sections={sections}
          categoriesById={categoriesById}
          onPressItem={(txn) => navigation.navigate('TransactionDetail', { id: txn.id })}
          ListFooterComponent={<AdSlot placement="transactions_list_end" />}
        />
      )}

      <TransactionFiltersSheet
        sheetRef={filtersSheetRef}
        categories={allCategories}
        value={filters}
        onApply={(f) => {
          setExplicitRange(null);
          setFilters(f);
        }}
        resultCount={(f) => transactionsRepo.list(buildParams(f)).length}
      />
    </SafeAreaView>
  );
}
