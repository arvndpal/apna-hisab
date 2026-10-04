import React from 'react';
import { AppText, type AppTextColor } from './AppText';
import { formatRupees, type AmountKind } from '../../utils/money';
import { typography } from '../../theme/tokens';

const SIZE_TO_VARIANT: Record<string, keyof typeof typography> = {
  XXL: 'amountXXL',
  XL: 'amountXL',
  L: 'amountL',
  M: 'amountM',
  row: 'amountRow',
  input: 'amountInput',
};

const KIND_TO_COLOR: Record<AmountKind, AppTextColor> = {
  income: 'income',
  expense: 'expense',
  net: 'primary',
  neutral: 'primary',
};

export interface AmountProps {
  paise: number;
  kind?: AmountKind;
  size?: keyof typeof SIZE_TO_VARIANT;
  showSign?: boolean;
  color?: AppTextColor;
  testID?: string;
}

/** Formats paise with Indian grouping + the design system's sign/colour rules. */
export function Amount({ paise, kind = 'neutral', size = 'M', showSign, color, testID }: AmountProps) {
  const text = formatRupees(paise, kind, showSign);
  const amountColor =
    color ?? (kind === 'net' ? (paise > 0 ? 'income' : paise < 0 ? 'expense' : 'primary') : KIND_TO_COLOR[kind]);

  return (
    <AppText
      variant={SIZE_TO_VARIANT[size]}
      color={amountColor}
      style={{ fontVariant: ['tabular-nums'] }}
      accessibilityLabel={`${formatRupees(paise, 'neutral', false).replace('₹', '')} rupees${
        kind !== 'neutral' ? ` ${kind}` : ''
      }`}
      testID={testID}
    >
      {text}
    </AppText>
  );
}
