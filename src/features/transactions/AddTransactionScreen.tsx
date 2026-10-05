import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, TextInput, View, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, Trash2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { IncomeExpenseToggle } from '../../components/common/SegmentedControl';
import { AmountInput } from '../../components/forms/AmountInput';
import { NumericKeypad } from '../../components/forms/NumericKeypad';
import { CategorySelector } from '../../components/forms/CategorySelector';
import { PaymentMethodSelector } from '../../components/forms/PaymentMethodSelector';
import { DateSelector } from '../../components/forms/DateSelector';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useCategories } from '../../hooks/useCategories';
import * as transactionsRepo from '../../database/repositories/transactionsRepo';
import * as settingsRepo from '../../database/repositories/settingsRepo';
import { applyKey, rawToPaise, paiseToRaw, MAX_AMOUNT_PAISE } from '../../utils/money';
import { showToast } from '../../store/toastStore';
import { radius, typography, fontFamily } from '../../theme/tokens';
import type { AppStackParamList } from '../../app/navigation/types';
import type { PaymentMethod } from '../../types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'AddTransaction'>;

export function AddTransactionScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const palette = useTheme();
  const userId = useActiveUserId();
  const { type: initialType, editId, date } = route.params;

  const editing = transactionsRepo.getById(editId ?? '') ?? null;
  const [type, setType] = useState<'income' | 'expense'>(editing?.type ?? initialType);
  const [raw, setRaw] = useState(editing ? paiseToRaw(editing.amountPaise) : '');
  const categories = useCategories(userId, type);
  const [categoryId, setCategoryId] = useState<string | null>(
    editing?.categoryId ?? settingsRepo.getLastCategoryId(type) ?? null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editing?.paymentMethod ?? settingsRepo.getLastPaymentMethod() ?? 'cash',
  );
  const [occurredAt, setOccurredAt] = useState<Date>(
    editing ? new Date(editing.occurredAt) : date ? new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`) : new Date(),
  );
  const [note, setNote] = useState(editing?.note ?? '');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Switching type keeps the amount but swaps the category list back to that type's last used.
  useEffect(() => {
    if (!editing) setCategoryId(settingsRepo.getLastCategoryId(type) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const tint = type === 'income' ? palette.incomeTint : palette.expenseTint;
  const amountPaise = useMemo(() => rawToPaise(raw), [raw]);

  const handleClose = () => {
    if (raw.length > 0 && !editing) {
      setShowDiscard(true);
    } else {
      navigation.goBack();
    }
  };

  const handleSave = () => {
    if (amountPaise <= 0) {
      setAmountError(t('validation.amountRequired'));
      return;
    }
    if (amountPaise > MAX_AMOUNT_PAISE) {
      setAmountError(t('validation.amountTooLarge'));
      return;
    }
    if (!categoryId) {
      setAmountError(t('validation.categoryRequired'));
      return;
    }
    setAmountError(null);

    settingsRepo.setLastCategoryId(type, categoryId);
    settingsRepo.setLastPaymentMethod(paymentMethod);

    if (editing) {
      transactionsRepo.update(editing.id, { type, amountPaise, categoryId, paymentMethod, occurredAt, note: note || null });
    } else {
      transactionsRepo.create({ userId, type, amountPaise, categoryId, paymentMethod, occurredAt, note: note || null });
    }

    Vibration.vibrate(10);
    navigation.goBack();
    showToast({ message: t(editing ? 'toast.updated' : type === 'income' ? 'toast.incomeAdded' : 'toast.expenseAdded') });
  };

  const handleDelete = () => {
    if (!editing) return;
    transactionsRepo.softDelete(editing.id);
    setShowDelete(false);
    navigation.goBack();
    showToast({
      message: t('toast.deleted'),
      actionLabel: t('common.undo'),
      onAction: () => transactionsRepo.restore(editing.id),
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface }} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ backgroundColor: tint, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 18, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <IconButton icon={X} onPress={handleClose} accessibilityLabel={t('common.close')} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <IncomeExpenseToggle value={type} onChange={setType} incomeLabel={t('add.toggleIncome')} expenseLabel={t('add.toggleExpense')} />
            </View>
            <View style={{ width: 44 }}>
              {editing ? <IconButton icon={Trash2} onPress={() => setShowDelete(true)} accessibilityLabel={t('common.delete')} color={palette.error} /> : null}
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <AmountInput
              raw={raw}
              kind={type}
              label={t(editing ? (type === 'income' ? 'add.editLabelIncome' : 'add.editLabelExpense') : type === 'income' ? 'add.amountLabelIncome' : 'add.amountLabelExpense')}
              directionCaption={t(type === 'income' ? 'add.moneyIn' : 'add.moneyOut')}
            />
            {amountError ? (
              <AppText variant="caption" color="error" style={{ textAlign: 'center', marginTop: 6 }}>
                {amountError}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={{ paddingTop: 16, paddingHorizontal: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
            <DateSelector value={occurredAt} onChange={setOccurredAt} />
          </View>

          <TextInput
            value={note}
            onChangeText={(text) => setNote(text.slice(0, 120))}
            placeholder={`${t('common.note')} (${t('common.optional')})`}
            placeholderTextColor={palette.textTertiary}
            maxLength={120}
            style={{
              height: 48,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: radius.input,
              paddingHorizontal: 14,
              fontFamily: fontFamily[typography.body.weight],
              fontSize: typography.body.size,
              color: palette.textPrimary,
            }}
          />

          <View>
            <AppText variant="label" color="secondary" style={{ marginBottom: 10 }}>
              {t('add.category')}
            </AppText>
            <CategorySelector categories={categories} type={type} selectedId={categoryId} onSelect={setCategoryId} />
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={Keyboard.dismiss} style={{ width: '100%' }}>
        <NumericKeypad
          onKeyPress={(key) => {
            setAmountError(null);
            setRaw((prev) => applyKey(prev, key));
          }}
          onClear={() => setRaw('')}
        />
      </Pressable>

      <View style={{ padding: 16, paddingBottom: 18, backgroundColor: palette.surface }}>
        <Button
          label={t(editing ? 'add.saveChanges' : type === 'income' ? 'add.saveIncome' : 'add.saveExpense')}
          variant={type}
          onPress={handleSave}
        />
      </View>

      <ConfirmDialog
        visible={showDiscard}
        title={t('add.discardTitle')}
        cancelLabel={t('add.keepEditing')}
        confirmLabel={t('add.discard')}
        destructive
        onCancel={() => setShowDiscard(false)}
        onConfirm={() => {
          setShowDiscard(false);
          navigation.goBack();
        }}
      />
      <ConfirmDialog
        visible={showDelete}
        icon={Trash2}
        destructive
        title={t('delete.title')}
        body={t('delete.body')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={() => setShowDelete(false)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}
