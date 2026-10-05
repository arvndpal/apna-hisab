import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Banknote, QrCode, CreditCard, Landmark, Check, type LucideIcon } from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Chip } from '../common/Chip';
import { AppText } from '../common/AppText';
import { AppBottomSheet } from '../common/BottomSheet';
import { useTheme } from '../../hooks/useTheme';
import type { PaymentMethod } from '../../types/models';

const METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank'];
const ICONS: Record<PaymentMethod, LucideIcon> = { cash: Banknote, upi: QrCode, card: CreditCard, bank: Landmark };

export interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  const { t } = useTranslation();
  const palette = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);

  return (
    <>
      <Chip label={t(`payment.${value}`)} icon={ICONS[value]} showChevron onPress={() => sheetRef.current?.present()} />
      <AppBottomSheet ref={sheetRef} title={t('add.paymentMethod')} onClose={() => {}}>
        <View style={{ gap: 4 }}>
          {METHODS.map((method) => {
            const Icon = ICONS[method];
            const selected = method === value;
            return (
              <Pressable
                key={method}
                onPress={() => {
                  onChange(method);
                  sheetRef.current?.dismiss();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 4 }}
              >
                <Icon size={20} color={palette.textPrimary} strokeWidth={2} />
                <AppText variant="rowTitle" style={{ flex: 1 }}>
                  {t(`payment.${method}`)}
                </AppText>
                {selected ? <Check size={20} color={palette.primary} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
        </View>
      </AppBottomSheet>
    </>
  );
}
