import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';
import { CloudCheck, CloudOff, CloudUpload, RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Banner } from '../../components/common/Banner';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { syncStatusColors } from '../../components/common/SyncStatus';
import { useTheme } from '../../hooks/useTheme';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useSettingsStore } from '../../store/settingsStore';
import { sync } from '../../sync/syncEngine/engine';
import { formatSince } from '../../utils/relativeTime';
import type { SyncUiStatus } from '../../types/models';

const ICONS: Record<SyncUiStatus, LucideIcon> = {
  synced: CloudCheck,
  pending: CloudUpload,
  syncing: RefreshCw,
  offline: CloudOff,
  error: TriangleAlert,
};

/** SCREENS.md §19b — the big status block, last synced, pending count, Sync now. */
export function SyncBackupScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const { status, pendingCount, lastSyncedAt } = useSyncStatus();
  const [offlineNotice, setOfflineNotice] = useState(false);

  const copy: Record<SyncUiStatus, { title: string; body: string }> = {
    synced: { title: t('syncBackup.syncedTitle'), body: t('syncBackup.syncedBody') },
    pending: { title: t('syncBackup.pendingTitle'), body: t('syncBackup.pendingBody', { count: pendingCount }) },
    syncing: { title: t('syncBackup.syncingTitle'), body: t('syncBackup.syncingBody') },
    offline: { title: t('sync.offlineBannerTitle'), body: t('sync.offlineBanner') },
    error: { title: t('sync.errorBannerTitle'), body: t('sync.errorBanner') },
  };
  const colors = syncStatusColors(palette)[status];
  const Icon = ICONS[status];

  const handleSyncNow = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      setOfflineNotice(true);
      return;
    }
    setOfflineNotice(false);
    sync();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title={t('syncBackup.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 16 }}>
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }} accessibilityLiveRegion="polite">
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={34} color={colors.fg} strokeWidth={2} />
          </View>
          <AppText variant="titlePushed" style={{ textAlign: 'center' }}>
            {copy[status].title}
          </AppText>
          <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
            {copy[status].body}
          </AppText>
        </Card>

        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <AppText variant="label" color="secondary">
              {t('syncBackup.lastSynced')}
            </AppText>
            <AppText variant="label" style={{ flexShrink: 1, textAlign: 'right' }}>
              {lastSyncedAt ? formatSince(lastSyncedAt, t, language) : t('settings.notSyncedYet')}
            </AppText>
          </View>
          <View style={{ height: 1, backgroundColor: palette.border }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <AppText variant="label" color="secondary">
              {t('syncBackup.pending')}
            </AppText>
            <AppText variant="label">{String(pendingCount)}</AppText>
          </View>
        </Card>

        {offlineNotice ? <Banner variant="neutral" title={t('sync.offlineManualTitle')} body={t('sync.offlineManual')} onDismiss={() => setOfflineNotice(false)} /> : null}

        <Button
          label={status === 'error' ? t('common.retry') : t('settings.syncNow')}
          icon={RefreshCw}
          onPress={handleSyncNow}
          loading={status === 'syncing'}
        />

        <AppText variant="secondary" color="secondary" style={{ textAlign: 'center' }}>
          {t('sync.storedNote')}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}
