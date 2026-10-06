import React, { useMemo } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, List } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { EmptyState } from '../../components/common/EmptyState';
import { TransactionList, groupByDay } from '../../components/transactions/TransactionList';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useCategoriesById } from '../../hooks/useCategories';
import { useSettingsStore } from '../../store/settingsStore';
import * as transactionsRepo from '../../database/repositories/transactionsRepo';
import type { AppStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'DayTransactions'>;

export function DayTransactionsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const palette = useTheme();
  const userId = useActiveUserId();
  const language = useSettingsStore((s) => s.language);
  const { date } = route.params;

  const categoriesById = useCategoriesById(userId);
  const transactions = useLiveQuery(
    ['transactions'],
    () => transactionsRepo.list({ userId, from: date, to: date }),
    [userId, date],
  );
  const sections = useMemo(() => groupByDay(transactions, t), [transactions, t]);

  const title = new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
        <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} />
        <AppText variant="titlePushed" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </AppText>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label={t('home.addIncome')} variant="incomeTonal" onPress={() => navigation.navigate('AddTransaction', { type: 'income', date })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('home.addExpense')} variant="expenseTonal" onPress={() => navigation.navigate('AddTransaction', { type: 'expense', date })} />
        </View>
      </View>

      {transactions.length === 0 ? (
        <EmptyState icon={List} title={t('empty.transactions.title')} body={t('empty.transactions.body')} />
      ) : (
        <TransactionList sections={sections} categoriesById={categoriesById} onPressItem={(txn) => navigation.navigate('TransactionDetail', { id: txn.id })} />
      )}
    </SafeAreaView>
  );
}
