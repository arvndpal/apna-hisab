import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';
import { radius } from '../../theme/tokens';

export interface OptionProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
  minHeight?: number;
}

/** Full-width radio card. Selected = primary border + primaryTint bg. */
export function Option({ title, subtitle, selected, onPress, disabled, badge, minHeight = 60 }: OptionProps) {
  const palette = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      style={{
        minHeight,
        borderRadius: radius.option,
        borderWidth: 1.5,
        borderColor: selected ? palette.primary : palette.border,
        backgroundColor: selected ? palette.primaryTint : palette.surface,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? palette.primary : palette.textTertiary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: palette.primary }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText variant="section">{title}</AppText>
          {badge ? (
            <View style={{ backgroundColor: palette.warningTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <AppText variant="caption" style={{ color: palette.warning }}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <AppText variant="secondary" color="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
