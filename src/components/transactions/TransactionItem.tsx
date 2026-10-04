import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../common/AppText';
import { Amount } from '../common/Amount';
import { DynamicIcon } from '../common/DynamicIcon';
import { useTheme } from '../../hooks/useTheme';
import { formatPaise } from '../../utils/money';
import type { Transaction } from '../../types/models';

export interface TransactionItemProps {
  transaction: Transaction;
  categoryName: string;
  categoryIcon: string;
  onPress: () => void;
  onLongPress?: () => void;
  showDivider?: boolean;
}

/** Row: icon tile, category name + note/payment/time, signed amount. Pending rows get a warning note. */
export function TransactionItem({ transaction, categoryName, categoryIcon, onPress, onLongPress, showDivider = true }: TransactionItemProps) {
  const { t } = useTranslation();
  const palette = useTheme();
  const tint = transaction.type === 'income' ? palette.incomeTint : palette.expenseTint;
  const fg = transaction.type === 'income' ? palette.income : palette.expense;

  const time = new Date(transaction.occurredAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const paymentLabel = t(`payment.${transaction.paymentMethod}`);
  const subtitleBase = `${transaction.note || t(`transactions.${transaction.type}`)} · ${paymentLabel} · ${time}`;

  const a11yAmount = t(transaction.type === 'income' ? 'a11y.amountIncome' : 'a11y.amountExpense', {
    amount: formatPaise(transaction.amountPaise),
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${categoryName}, ${a11yAmount}, ${paymentLabel}, ${time}`}
      style={{
        minHeight: 60,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: palette.border,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
        <DynamicIcon name={categoryIcon} size={20} color={fg} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="rowTitle" numberOfLines={1}>
          {categoryName}
        </AppText>
        <AppText variant="secondary" color="secondary" numberOfLines={1}>
          {subtitleBase}
          {transaction.syncStatus === 'pending' ? (
            <AppText variant="secondary" style={{ color: palette.warning }}>
              {` · ↻ ${t('transactions.pending')}`}
            </AppText>
          ) : null}
        </AppText>
      </View>
      <Amount paise={transaction.amountPaise} kind={transaction.type} size="row" />
    </Pressable>
  );
}
