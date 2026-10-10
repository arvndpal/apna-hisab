import React from 'react';
import { FlatList, View } from 'react-native';
import type { TFunction } from 'i18next';
import { AppText } from '../common/AppText';
import { Amount } from '../common/Amount';
import { Card } from '../common/Card';
import { TransactionItem } from './TransactionItem';
import { useSettingsStore } from '../../store/settingsStore';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import { toOccurredOn } from '../../utils/dates';
import { layout } from '../../theme/tokens';
import type { Category, Transaction } from '../../types/models';

export interface DaySection {
  occurredOn: string;
  title: string;
  netPaise: number;
  data: Transaction[];
}

/** Groups transactions (already sorted desc by occurred_at) into day sections with each day's net. */
export function groupByDay(transactions: Transaction[], t: TFunction): DaySection[] {
  const today = toOccurredOn(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toOccurredOn(yesterdayDate);

  const map = new Map<string, Transaction[]>();
  for (const txn of transactions) {
    const list = map.get(txn.occurredOn) ?? [];
    list.push(txn);
    map.set(txn.occurredOn, list);
  }

  return Array.from(map.entries()).map(([occurredOn, data]) => {
    const net = data.reduce((sum, txn) => sum + (txn.type === 'income' ? txn.amountPaise : -txn.amountPaise), 0);
    const dateLabel = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(new Date(`${occurredOn}T00:00:00`));
    const title =
      occurredOn === today
        ? t('transactions.todayHeader', { date: dateLabel })
        : occurredOn === yesterday
          ? t('transactions.yesterdayHeader', { date: dateLabel })
          : dateLabel;
    return { occurredOn, title, netPaise: net, data };
  });
}

export interface TransactionListProps {
  sections: DaySection[];
  categoriesById: Record<string, Category>;
  onPressItem: (transaction: Transaction) => void;
  onLongPressItem?: (transaction: Transaction) => void;
  ListHeaderComponent?: React.ReactElement;
  ListFooterComponent?: React.ReactElement;
  onEndReached?: () => void;
}

export function TransactionList({
  sections,
  categoriesById,
  onPressItem,
  onLongPressItem,
  ListHeaderComponent,
  ListFooterComponent,
  onEndReached,
}: TransactionListProps) {
  const language = useSettingsStore((s) => s.language);

  return (
    <FlatList
      data={sections}
      keyExtractor={(section) => section.occurredOn}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      // Extra bottom room so the last row can scroll clear of the FAB, which rises above the tab bar.
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: layout.fabLift + 24, gap: 10 }}
      renderItem={({ item: section }) => (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <AppText variant="section">{section.title}</AppText>
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'baseline' }}>
              <AppText variant="caption" color="secondary">
                Net
              </AppText>
              <Amount paise={section.netPaise} kind="net" size="row" />
            </View>
          </View>
          <Card padded>
            <View style={{ marginHorizontal: -16 }}>
              {section.data.map((txn, index) => {
                const category = categoriesById[txn.categoryId];
                return (
                  <View key={txn.id} style={{ paddingHorizontal: 16 }}>
                    <TransactionItem
                      transaction={txn}
                      categoryName={category ? categoryDisplayName(category, language) : ''}
                      categoryIcon={category?.icon ?? 'LayoutGrid'}
                      onPress={() => onPressItem(txn)}
                      onLongPress={onLongPressItem ? () => onLongPressItem(txn) : undefined}
                      showDivider={index < section.data.length - 1}
                    />
                  </View>
                );
              })}
            </View>
          </Card>
        </View>
      )}
    />
  );
}
