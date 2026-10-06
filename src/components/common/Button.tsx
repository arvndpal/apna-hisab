import React from 'react';
import { ActivityIndicator, Pressable, View, type GestureResponderEvent } from 'react-native';
import { Plus, Minus, type LucideIcon } from 'lucide-react-native';
import { AppText, type AppTextColor } from './AppText';
import { GradientSurface } from './GradientSurface';
import { useTheme } from '../../hooks/useTheme';
import { radius, shadows, layout } from '../../theme/tokens';

export type ButtonVariant =
  | 'primary'
  | 'income'
  | 'expense'
  | 'incomeTonal'
  | 'expenseTonal'
  | 'secondary'
  | 'ghost'
  | 'ghostDanger'
  | 'danger'
  | 'dangerOutline';

export interface ButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: 'default' | 'sm';
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

const TONAL_ICON: Record<string, LucideIcon> = { incomeTonal: Plus, expenseTonal: Minus };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  icon: Icon,
  disabled,
  loading,
  fullWidth = true,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const palette = useTheme();
  const height = size === 'sm' ? layout.buttonHeightSm : layout.buttonHeight;
  const isTonal = variant === 'incomeTonal' || variant === 'expenseTonal';
  const TonalIcon = TONAL_ICON[variant];

  const bg: Partial<Record<ButtonVariant, string>> = {
    income: palette.income,
    expense: palette.expense,
    incomeTonal: palette.incomeTint,
    expenseTonal: palette.expenseTint,
    secondary: palette.surface,
    ghost: 'transparent',
    ghostDanger: 'transparent',
    danger: palette.error,
    dangerOutline: palette.surface,
  };

  const textColor: Record<ButtonVariant, AppTextColor> = {
    primary: 'onPrimary',
    income: 'onPrimary',
    expense: 'onPrimary',
    incomeTonal: 'income',
    expenseTonal: 'expense',
    secondary: 'primary',
    ghost: 'primary',
    ghostDanger: 'error',
    danger: 'onPrimary',
    dangerOutline: 'error',
  };

  const border: Partial<Record<ButtonVariant, { borderWidth: number; borderColor: string }>> = {
    secondary: { borderWidth: 1.5, borderColor: palette.border },
    dangerOutline: { borderWidth: 1.5, borderColor: palette.error },
  };

  const glow: Partial<Record<ButtonVariant, object>> = {
    income: shadows.primaryGlow,
    expense: { ...shadows.primaryGlow, shadowColor: palette.expense },
    danger: { ...shadows.primaryGlow, shadowColor: palette.error },
  };

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {loading ? (
        <ActivityIndicator color={textColor[variant] === 'onPrimary' ? '#FFFFFF' : palette.primary} />
      ) : (
        <>
          {isTonal && TonalIcon ? (
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: variant === 'incomeTonal' ? palette.income : palette.expense,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TonalIcon size={16} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          ) : Icon ? (
            <Icon size={18} color={textColor[variant] === 'onPrimary' ? '#FFFFFF' : textColor[variant] === 'error' ? palette.error : palette.textPrimary} strokeWidth={2} />
          ) : null}
          <AppText variant="button" color={textColor[variant]}>
            {label}
          </AppText>
        </>
      )}
    </View>
  );

  const isPressDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={isPressDisabled ? undefined : onPress}
        disabled={isPressDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled }}
        testID={testID}
        style={({ pressed }) => [
          { opacity: disabled ? 0.4 : pressed ? 0.92 : 1, alignSelf: fullWidth ? 'stretch' : 'flex-start' },
        ]}
      >
        <GradientSurface
          variant="button"
          style={{
            height,
            borderRadius: size === 'sm' ? radius.buttonSm : radius.button,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20,
            ...shadows.primaryGlow,
          }}
        >
          {content}
        </GradientSurface>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={isPressDisabled ? undefined : onPress}
      disabled={isPressDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
    >
      {({ pressed }) => (
        <View
          style={{
            height,
            borderRadius: size === 'sm' ? radius.buttonSm : radius.button,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20,
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
            opacity: disabled ? 0.4 : pressed ? 0.92 : 1,
            backgroundColor: bg[variant],
            ...(border[variant] ?? {}),
            ...(glow[variant] ?? {}),
          }}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="secondary" />;
}
