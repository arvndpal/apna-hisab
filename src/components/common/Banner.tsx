import React from 'react';
import { Pressable, View } from 'react-native';
import { CloudOff, AlertTriangle, X, type LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';
import { radius } from '../../theme/tokens';

export type BannerVariant = 'neutral' | 'warning';

export interface BannerProps {
  variant: BannerVariant;
  title: string;
  body?: string;
  onDismiss?: () => void;
}

const ICONS: Record<BannerVariant, LucideIcon> = { neutral: CloudOff, warning: AlertTriangle };

/** Inline, persistent banner for offline/error states (docs/SCREENS.md §20) — not a toast, stays until dismissed or resolved. */
export function Banner({ variant, title, body, onDismiss }: BannerProps) {
  const palette = useTheme();
  const Icon = ICONS[variant];
  const colors = variant === 'warning' ? { bg: palette.warningTint, fg: palette.warning } : { bg: palette.muted, fg: palette.textSecondary };

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        backgroundColor: colors.bg,
        borderRadius: radius.card,
        padding: 14,
      }}
    >
      <Icon size={20} color={colors.fg} strokeWidth={2} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="rowTitle" style={{ color: colors.fg }}>
          {title}
        </AppText>
        {body ? (
          <AppText variant="secondary" style={{ color: colors.fg }}>
            {body}
          </AppText>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10}>
          <X size={18} color={colors.fg} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}
