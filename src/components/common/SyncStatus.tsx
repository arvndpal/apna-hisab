import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCw, CloudOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';
import type { SyncUiStatus } from '../../types/models';

export interface SyncStatusProps {
  status: SyncUiStatus;
  pendingCount?: number;
  variant?: 'default' | 'glass';
  /** Overrides the default label — e.g. a single row's status chip just says "Pending", not "1 transaction pending". */
  label?: string;
}

const ICONS: Record<SyncUiStatus, LucideIcon> = {
  synced: Check,
  pending: RefreshCw,
  syncing: RefreshCw,
  offline: CloudOff,
  error: RefreshCw,
};

/** Pill, 12.5/600. `variant="glass"` is for placement on the gradient hero. */
export function SyncStatus({ status, pendingCount = 0, variant = 'default', label }: SyncStatusProps) {
  const { t } = useTranslation();
  const palette = useTheme();
  const Icon = ICONS[status];

  const labels: Record<SyncUiStatus, string> = {
    synced: t('sync.synced'),
    pending: t('sync.pending', { count: pendingCount }),
    syncing: t('sync.syncing'),
    offline: t('sync.offline'),
    error: t('sync.error'),
  };

  const colors: Record<SyncUiStatus, { bg: string; fg: string }> = {
    synced: { bg: palette.incomeTint, fg: palette.income },
    pending: { bg: palette.warningTint, fg: palette.warning },
    syncing: { bg: palette.warningTint, fg: palette.warning },
    offline: { bg: palette.muted, fg: palette.textSecondary },
    error: { bg: palette.errorTint, fg: palette.error },
  };

  const isGlass = variant === 'glass';
  const bg = isGlass ? 'rgba(0,20,16,0.24)' : colors[status].bg;
  const fg = isGlass ? '#FFFFFF' : colors[status].fg;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: bg,
        borderRadius: 999,
        paddingVertical: 5,
        paddingHorizontal: 11,
      }}
    >
      <Icon size={14} color={fg} strokeWidth={2.5} />
      <AppText variant="caption" style={{ color: fg }}>
        {label ?? labels[status]}
      </AppText>
    </View>
  );
}
