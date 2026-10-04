import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, type LucideIcon } from 'lucide-react-native';
import { AppText, type AppTextColor } from './AppText';
import { useTheme } from '../../hooks/useTheme';
import { radius, layout } from '../../theme/tokens';

export type ChipSelectedVariant = 'brand' | 'income' | 'expense';

export interface ChipProps {
  label: string;
  onPress?: () => void;
  icon?: LucideIcon;
  showChevron?: boolean;
  selected?: boolean;
  selectedVariant?: ChipSelectedVariant;
  size?: 'default' | 'sm';
  testID?: string;
  accessibilityLabel?: string;
}

/** Height 40 (36 sm), radius 20, muted bg. Selected adds a 1.5 border + tint in the given variant. */
export function Chip({
  label,
  onPress,
  icon: Icon,
  showChevron,
  selected,
  selectedVariant = 'brand',
  size = 'default',
  testID,
  accessibilityLabel,
}: ChipProps) {
  const palette = useTheme();

  const selectedColors: Record<ChipSelectedVariant, { bg: string; border: string; text: AppTextColor }> = {
    brand: { bg: palette.primaryTint, border: palette.primary, text: 'brand' },
    income: { bg: palette.incomeTint, border: palette.income, text: 'income' },
    expense: { bg: palette.expenseTint, border: palette.expense, text: 'expense' },
  };
  const sel = selectedColors[selectedVariant];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      testID={testID}
      style={({ pressed }) => ({
        height: size === 'sm' ? 36 : layout.chipHeight,
        borderRadius: radius.chip,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? sel.bg : palette.muted,
        borderWidth: selected ? 1.5 : 0,
        borderColor: selected ? sel.border : 'transparent',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {Icon ? <Icon size={16} color={selected ? sel.border : palette.textSecondary} strokeWidth={2} /> : null}
      <AppText variant="label" color={selected ? sel.text : 'primary'}>
        {label}
      </AppText>
      {showChevron ? <ChevronDown size={16} color={palette.textTertiary} strokeWidth={2} /> : null}
    </Pressable>
  );
}

/** A compact selectable pill with no leading icon — filters, period selectors. */
export function FilterChip(props: Omit<ChipProps, 'icon' | 'showChevron'>) {
  return <Chip {...props} />;
}

export function ChipRow({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}
