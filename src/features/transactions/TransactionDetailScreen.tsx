import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/common/AppText';
import { Amount } from '../../components/common/Amount';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SyncStatus } from '../../components/common/SyncStatus';
import { DynamicIcon } from '../../components/common/DynamicIcon';
import { useTheme } from '../../hooks/useTheme';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useSettingsStore } from '../../store/settingsStore';
import * as transactionsRepo from '../../database/repositories/transactionsRepo';
import * as categoriesRepo from '../../database/repositories/categoriesRepo';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import { showToast } from '../../store/toastStore';
import type { AppStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'TransactionDetail'>;

export function TransactionDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const [showDelete, setShowDelete] = useState(false);

  const transaction = useLiveQuery(['transactions'], () => transactionsRepo.getById(route.params.id), [route.params.id]);

  if (!transaction) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
          {t('errors.transactionGone')}
        </AppText>
        <Button label={t('common.back')} variant="secondary" fullWidth={false} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const category = categoriesRepo.getById(transaction.categoryId);
  const tint = transaction.type === 'income' ? palette.incomeTint : palette.expenseTint;
  const fg = transaction.type === 'income' ? palette.income : palette.expense;
  const dateLabel = new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(transaction.occurredAt));

  const handleDelete = () => {
    transactionsRepo.softDelete(transaction.id);
    setShowDelete(false);
    navigation.goBack();
    showToast({ message: t('toast.deleted'), actionLabel: t('common.undo'), onAction: () => transactionsRepo.restore(transaction.id) });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
        <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} />
        <AppText variant="titlePushed">{t('transactions.detailTitle')}</AppText>
      </View>

      <View style={{ padding: 20, gap: 16 }}>
        <Card style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
            <DynamicIcon name={category?.icon ?? 'LayoutGrid'} size={28} color={fg} strokeWidth={2} />
          </View>
          <View style={{ backgroundColor: tint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <AppText variant="caption" style={{ color: fg }}>
              {t(`transactions.${transaction.type}`)}
            </AppText>
          </View>
          <Amount paise={transaction.amountPaise} kind={transaction.type} size="XXL" />
          <AppText variant="section">{category ? categoryDisplayName(category, language) : ''}</AppText>
        </Card>

        <Card>
          <View style={{ gap: 0 }}>
            {[
              { label: t('add.paymentMethod'), value: t(`payment.${transaction.paymentMethod}`) },
              { label: t('add.date'), value: dateLabel },
              ...(transaction.note ? [{ label: t('common.note'), value: transaction.note }] : []),
            ].map((row, i, arr) => (
              <View key={row.label} style={{ flexDirection: 'row', paddingVertical: 14, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: palette.border }}>
                <AppText variant="body" color="secondary" style={{ width: 120 }}>
                  {row.label}
                </AppText>
                <AppText variant="rowTitle" style={{ flex: 1 }}>
                  {row.value}
                </AppText>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 14 }}>
              <AppText variant="body" color="secondary" style={{ width: 120 }}>
                {t('transactions.status')}
              </AppText>
              <SyncStatus
                status={transaction.syncStatus === 'synced' ? 'synced' : 'pending'}
                label={transaction.syncStatus === 'synced' ? undefined : t('transactions.pending').replace(/^./, (c) => c.toUpperCase())}
              />
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button label={t('common.edit')} variant="secondary" icon={Pencil} onPress={() => navigation.navigate('AddTransaction', { type: transaction.type, editId: transaction.id })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={t('common.delete')} variant="dangerOutline" icon={Trash2} onPress={() => setShowDelete(true)} />
          </View>
        </View>
      </View>

      <ConfirmDialog
        visible={showDelete}
        icon={Trash2}
        destructive
        title={t('delete.title')}
        body={t('delete.body')}
        summary={
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Amount paise={transaction.amountPaise} kind="neutral" size="M" color={transaction.type === 'income' ? 'income' : 'expense'} />
            <AppText variant="secondary" color="secondary">
              {category ? categoryDisplayName(category, language) : ''} · {t(`transactions.${transaction.type}`)} · {dateLabel}
            </AppText>
          </View>
        }
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={() => setShowDelete(false)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}
