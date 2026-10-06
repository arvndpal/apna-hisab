import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { AppText, type AppTextColor } from './AppText';
import { useTheme } from '../../hooks/useTheme';
import { radius, shadows } from '../../theme/tokens';

export interface MenuRowProps {
  label: string;
  icon?: LucideIcon;
  subtitle?: string;
  /** Right-aligned value text ("English", "Free"). Rows with a value don't show a chevron. */
  value?: string;
  valueColor?: string;
  /** Replaces value/chevron on the right (a Switch, a SyncStatus chip). */
  right?: ReactNode;
  onPress?: () => void;
  /** Label tone: 'error' for Delete account, 'brand' for text-button rows (Sync now, Manage subscription). */
  tone?: Extract<AppTextColor, 'primary' | 'error' | 'brand'>;
  showChevron?: boolean;
  showDivider?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** One row inside a settings/menu Card (More, Settings). 56dp min height, divider between rows. */
export function MenuRow({
  label,
  icon: Icon,
  subtitle,
  value,
  valueColor,
  right,
  onPress,
  tone = 'primary',
  showChevron,
  showDivider,
  disabled,
  accessibilityHint,
}: MenuRowProps) {
  const palette = useTheme();
  const iconColor = tone === 'error' ? palette.error : palette.primary;
  const chevron = showChevron ?? (!!onPress && value === undefined && !right);

  const content = (
    <View
      style={{
        minHeight: 56,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: palette.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {Icon ? <Icon size={22} color={iconColor} strokeWidth={2} /> : null}
      <View style={{ flex: 1 }}>
        <AppText variant="rowTitle" color={tone}>
          {label}
        </AppText>
        {subtitle ? (
          <AppText variant="secondary" color="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ??
        (value !== undefined ? (
          <AppText variant="label" color="secondary" style={[{ flexShrink: 1, textAlign: 'right' }, valueColor ? { color: valueColor } : null]}>
            {value}
          </AppText>
        ) : null)}
      {chevron ? <ChevronRight size={20} color={tone === 'brand' ? palette.primary : palette.textTertiary} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: palette.muted }}
    >
      {content}
    </Pressable>
  );
}

/** Group header + Card wrapper used by More and Settings ("Money", "Preferences", …). */
export function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  const palette = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="group" color="secondary" style={{ paddingHorizontal: 4 }} accessibilityRole="header">
        {title}
      </AppText>
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: radius.card,
          paddingHorizontal: 16,
          ...shadows.card,
        }}
      >
        {children}
      </View>
    </View>
  );
}
