import React from 'react';
import { Text, type TextProps } from 'react-native';
import { fontFamily, typography, HINDI_LINE_HEIGHT_FACTOR } from '../../theme/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';

export type AppTextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'income'
  | 'expense'
  | 'brand'
  | 'error'
  | 'onPrimary';

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  color?: AppTextColor;
  maxFontSizeMultiplier?: number;
}

/** Applies Mukta weight, Hindi line-height boost, and font-scale caps. The base building block for all copy. */
export function AppText({
  variant = 'body',
  color = 'primary',
  style,
  maxFontSizeMultiplier,
  children,
  ...rest
}: AppTextProps) {
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const type = typography[variant];

  const colorMap: Record<AppTextColor, string> = {
    primary: palette.textPrimary,
    secondary: palette.textSecondary,
    tertiary: palette.textTertiary,
    income: palette.income,
    expense: palette.expense,
    brand: palette.primary,
    error: palette.error,
    onPrimary: '#FFFFFF',
  };

  const lineHeight = language === 'hi' ? type.lineHeight * HINDI_LINE_HEIGHT_FACTOR : type.lineHeight;
  const isAmount = variant.startsWith('amount');

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (isAmount ? 1.3 : 1.5)}
      style={[
        {
          fontFamily: fontFamily[type.weight],
          fontSize: type.size,
          lineHeight,
          letterSpacing: type.letterSpacing,
          color: colorMap[color],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
