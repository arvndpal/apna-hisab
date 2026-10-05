import React, { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Users, ChevronRight } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Banner } from '../../components/common/Banner';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { HeroSummary } from '../../components/transactions/HeroSummary';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useSummary } from '../../hooks/useSummary';
import { useRecentTransactions } from '../../hooks/useRecentTransactions';
import { useUdhaarTotals } from '../../hooks/useUdhaarTotals';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useCategoriesById } from '../../hooks/useCategories';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import { useSettingsStore } from '../../store/settingsStore';
import { formatRupees } from '../../utils/money';
import { toOccurredOn } from '../../utils/dates';
import { sync as runSync } from '../../sync/syncEngine/engine';
import type { MainTabParamList } from '../../app/navigation/types';
import type { AppStackParamList } from '../../app/navigation/types';

type Nav = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Home'>, NativeStackNavigationProp<AppStackParamList>>;

function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function HomeScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<Nav>();
  const userId = useActiveUserId();
  const language = useSettingsStore((s) => s.language);

  const today = toOccurredOn(new Date());
  const summary = useSummary(userId, today, today);
  const recent = useRecentTransactions(userId, 4);
  const udhaar = useUdhaarTotals(userId);
  const sync = useSyncStatus();
  const categoriesById = useCategoriesById(userId);

  const [refreshing, setRefreshing] = useState(false);
  const [dismissedStatus, setDismissedStatus] = useState<string | null>(null);
  const lastStatus = useRef(sync.status);
  useEffect(() => {
    if (sync.status !== lastStatus.current) setDismissedStatus(null);
    lastStatus.current = sync.status;
  }, [sync.status]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await runSync();
    setRefreshing(false);
  };

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const greeting = t(`home.greeting.${greetingKey(now.getHours())}`, { name: t('home.defaultName') });

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <HeroSummary
          variant="home"
          dateLabel={dateLabel}
          greeting={greeting}
          initial={t('home.defaultName')}
          netPaise={summary.netPaise}
          incomePaise={summary.incomePaise}
          expensePaise={summary.expensePaise}
          incomeLabel={t('home.income')}
          expenseLabel={t('home.expense')}
          syncStatus={sync.status}
          pendingCount={sync.pendingCount}
          onPressAvatar={() => navigation.navigate('Settings')}
          onPressNet={() => navigation.navigate('Reports', { period: 'today' })}
        />

        <View style={{ paddingTop: 16, paddingHorizontal: 20, gap: 14 }}>
          {sync.status === 'offline' && dismissedStatus !== 'offline' ? (
            <Banner
              variant="neutral"
              title={t('sync.offlineBannerTitle')}
              body={t('sync.offlineBanner')}
              onDismiss={() => setDismissedStatus('offline')}
            />
          ) : null}
          {sync.status === 'error' && dismissedStatus !== 'error' ? (
            <Banner
              variant="warning"
              title={t('sync.errorBannerTitle')}
              body={t('sync.errorBanner')}
              onDismiss={() => setDismissedStatus('error')}
            />
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('home.addIncome')}
                variant="incomeTonal"
                onPress={() => navigation.navigate('AddTransaction', { type: 'income' })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={t('home.addExpense')}
                variant="expenseTonal"
                onPress={() => navigation.navigate('AddTransaction', { type: 'expense' })}
              />
            </View>
          </View>

          <Card onPress={() => navigation.navigate('UdhaarList')} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.udhaarTint, alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color={palette.udhaar} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="rowTitle">{t('home.udhaar')}</AppText>
                {udhaar.receivePaise === 0 && udhaar.payPaise === 0 ? (
                  <AppText variant="secondary" color="secondary">
                    {t('home.udhaarPromo')}
                  </AppText>
                ) : (
                  <AppText variant="secondary" color="secondary">
                    {t('home.udhaarSummary', {
                      receive: formatRupees(udhaar.receivePaise, 'neutral', false),
                      pay: formatRupees(udhaar.payPaise, 'neutral', false),
                    })}
                  </AppText>
                )}
              </View>
              <ChevronRight size={20} color={palette.textTertiary} strokeWidth={2} />
            </View>
          </Card>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <AppText variant="section">{t('home.recent')}</AppText>
            <AppText variant="label" style={{ color: palette.primary }} onPress={() => navigation.navigate('Transactions')}>
              {t('common.seeAll')}
            </AppText>
          </View>

          {recent.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('empty.transactions.title')}
              body={t('empty.transactions.body')}
              actions={[
                { label: t('empty.transactions.addIncome'), variant: 'incomeTonal', onPress: () => navigation.navigate('AddTransaction', { type: 'income' }) },
                { label: t('empty.transactions.addExpense'), variant: 'expenseTonal', onPress: () => navigation.navigate('AddTransaction', { type: 'expense' }) },
              ]}
            />
          ) : (
            <Card>
              <View style={{ marginHorizontal: -16 }}>
                {recent.map((txn, index) => {
                  const category = categoriesById[txn.categoryId];
                  return (
                    <View key={txn.id} style={{ paddingHorizontal: 16 }}>
                      <TransactionItem
                        transaction={txn}
                        categoryName={category ? categoryDisplayName(category, language) : ''}
                        categoryIcon={category?.icon ?? 'LayoutGrid'}
                        onPress={() => navigation.navigate('TransactionDetail', { id: txn.id })}
                        showDivider={index < recent.length - 1}
                      />
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
