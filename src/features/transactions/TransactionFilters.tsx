import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react-native';
import type BottomSheetLib from '@gorhom/bottom-sheet';
import { AppBottomSheet } from '../../components/common/BottomSheet';
import { AppText } from '../../components/common/AppText';
import { Chip, ChipRow } from '../../components/common/Chip';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import { radius, typography, fontFamily } from '../../theme/tokens';
import type { Category, PaymentMethod } from '../../types/models';
import type { RefObject } from 'react';

export interface TxnFilters {
  datePreset: 'today' | 'week' | 'month' | null;
  categoryIds: string[];
  paymentMethods: PaymentMethod[];
  minPaise: number | null;
  maxPaise: number | null;
}

export const EMPTY_FILTERS: TxnFilters = { datePreset: null, categoryIds: [], paymentMethods: [], minPaise: null, maxPaise: null };

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank'];

export interface TransactionFiltersSheetProps {
  sheetRef: RefObject<BottomSheetLib | null>;
  categories: Category[];
  value: TxnFilters;
  onApply: (filters: TxnFilters) => void;
  resultCount: (filters: TxnFilters) => number;
}

export function TransactionFiltersSheet({ sheetRef, categories, value, onApply, resultCount }: TransactionFiltersSheetProps) {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const [draft, setDraft] = useState<TxnFilters>(value);
  const [minText, setMinText] = useState(value.minPaise != null ? String(value.minPaise / 100) : '');
  const [maxText, setMaxText] = useState(value.maxPaise != null ? String(value.maxPaise / 100) : '');

  const toggleCategory = (id: string) =>
    setDraft((d) => ({ ...d, categoryIds: d.categoryIds.includes(id) ? d.categoryIds.filter((c) => c !== id) : [...d.categoryIds, id] }));
  const togglePayment = (m: PaymentMethod) =>
    setDraft((d) => ({ ...d, paymentMethods: d.paymentMethods.includes(m) ? d.paymentMethods.filter((p) => p !== m) : [...d.paymentMethods, m] }));

  const inputStyle = {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    fontFamily: fontFamily[typography.body.weight],
    fontSize: typography.body.size,
    color: palette.textPrimary,
  } as const;

  return (
    <AppBottomSheet
      ref={sheetRef}
      title={t('filters.title')}
      onClose={() => sheetRef.current?.close()}
    >
      <View style={{ gap: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -44 }}>
          <AppText
            variant="label"
            style={{ color: palette.primary }}
            onPress={() => {
              setDraft(EMPTY_FILTERS);
              setMinText('');
              setMaxText('');
            }}
          >
            {t('common.reset')}
          </AppText>
        </View>

        <View style={{ gap: 10 }}>
          <AppText variant="label" color="secondary">
            {t('filters.date')}
          </AppText>
          <ChipRow>
            <Chip label={t('common.today')} selected={draft.datePreset === 'today'} onPress={() => setDraft((d) => ({ ...d, datePreset: d.datePreset === 'today' ? null : 'today' }))} />
            <Chip label={t('filters.thisWeek')} selected={draft.datePreset === 'week'} onPress={() => setDraft((d) => ({ ...d, datePreset: d.datePreset === 'week' ? null : 'week' }))} />
            <Chip label={t('filters.thisMonth')} selected={draft.datePreset === 'month'} onPress={() => setDraft((d) => ({ ...d, datePreset: d.datePreset === 'month' ? null : 'month' }))} />
            <Chip label={t('filters.custom')} icon={Calendar} />
          </ChipRow>
        </View>

        <View style={{ gap: 10 }}>
          <AppText variant="label" color="secondary">
            {t('filters.category')}
          </AppText>
          <ChipRow>
            {categories.map((c) => (
              <Chip key={c.id} label={categoryDisplayName(c, language)} selected={draft.categoryIds.includes(c.id)} onPress={() => toggleCategory(c.id)} />
            ))}
          </ChipRow>
        </View>

        <View style={{ gap: 10 }}>
          <AppText variant="label" color="secondary">
            {t('filters.paymentMethod')}
          </AppText>
          <ChipRow>
            {PAYMENT_METHODS.map((m) => (
              <Chip key={m} label={t(`payment.${m}`)} selected={draft.paymentMethods.includes(m)} onPress={() => togglePayment(m)} />
            ))}
          </ChipRow>
        </View>

        <View style={{ gap: 10 }}>
          <AppText variant="label" color="secondary">
            {t('filters.amount')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={minText}
              onChangeText={(v) => {
                setMinText(v);
                setDraft((d) => ({ ...d, minPaise: v ? Math.round(Number(v) * 100) : null }));
              }}
              placeholder={t('filters.min')}
              placeholderTextColor={palette.textTertiary}
              keyboardType="numeric"
              style={inputStyle}
            />
            <TextInput
              value={maxText}
              onChangeText={(v) => {
                setMaxText(v);
                setDraft((d) => ({ ...d, maxPaise: v ? Math.round(Number(v) * 100) : null }));
              }}
              placeholder={t('filters.max')}
              placeholderTextColor={palette.textTertiary}
              keyboardType="numeric"
              style={inputStyle}
            />
          </View>
        </View>

        <Button
          label={t('filters.show', { count: resultCount(draft) })}
          onPress={() => {
            onApply(draft);
            sheetRef.current?.close();
          }}
        />
      </View>
    </AppBottomSheet>
  );
}
