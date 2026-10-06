import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import NetInfo from '@react-native-community/netinfo';
import { LogOut, RefreshCw, Trash2 } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Avatar } from '../../components/common/Avatar';
import { Banner } from '../../components/common/Banner';
import { AppBottomSheet } from '../../components/common/BottomSheet';
import { MenuGroup, MenuRow } from '../../components/common/MenuRow';
import { Option } from '../../components/common/Option';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { SyncStatus } from '../../components/common/SyncStatus';
import { Toggle } from '../../components/common/Toggle';
import { useTheme } from '../../hooks/useTheme';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { sync } from '../../sync/syncEngine/engine';
import { clearPin, disableBiometrics, enableBiometrics, hasHardwareBiometrics, unlockWithBiometrics } from '../../services/security/lock';
import { formatClock, formatSince } from '../../utils/relativeTime';
import { APP_VERSION } from '../../constants/app';
import { useEntitlement } from '../subscription/useEntitlement';
import { useLogout } from './useLogout';
import { PinPromptDialog } from './PinPromptDialog';
import type { AppStackParamList, RootStackParamList } from '../../app/navigation/types';

const LOCK_AFTER_OPTIONS = [
  { ms: 0, key: 'settings.lockImmediately' },
  { ms: 60_000, key: 'settings.lock1m' },
  { ms: 300_000, key: 'settings.lock5m' },
] as const;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const profile = useAuthStore((s) => s.profile);
  const settings = useSettingsStore();
  const { status, pendingCount, lastSyncedAt } = useSyncStatus();
  const { isPremium, renewsOn } = useEntitlement();
  const { requestLogout, dialog: logoutDialog } = useLogout();

  const lockAfterSheet = useRef<BottomSheetModal>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [confirmPinOff, setConfirmPinOff] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    hasHardwareBiometrics()
      .then(setBiometricsAvailable)
      .catch(() => setBiometricsAvailable(false));
  }, []);

  const pinOn = settings.lockMethod !== 'none';
  const biometricOn = settings.lockMethod === 'biometric';
  const lockAfterLabel = t(LOCK_AFTER_OPTIONS.find((o) => o.ms === settings.lockAfterMs)?.key ?? 'settings.lock1m');

  const openPinCreate = (method: 'pin' | 'biometric') =>
    rootNavigation?.navigate('Auth', { screen: 'PinCreate', params: { method, fromSettings: true } });

  const handlePinToggle = (next: boolean) => {
    if (next) openPinCreate('pin');
    else setConfirmPinOff(true);
  };

  const turnLockOff = async () => {
    setConfirmPinOff(false);
    await clearPin();
    await disableBiometrics();
    settings.setLockMethod('none');
  };

  const handleBiometricToggle = async (next: boolean) => {
    if (!next) {
      await disableBiometrics();
      settings.setLockMethod('pin');
      return;
    }
    // Fingerprint needs a PIN as its backup (SCREENS.md §19) — create one first if there isn't one.
    if (!pinOn) {
      openPinCreate('biometric');
      return;
    }
    try {
      await enableBiometrics();
      if (await unlockWithBiometrics()) settings.setLockMethod('biometric');
      else await disableBiometrics();
    } catch {
      await disableBiometrics();
    }
  };

  const handleSyncNow = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      setOfflineNotice(true);
      return;
    }
    setOfflineNotice(false);
    sync();
  };

  const [hh, mm] = settings.reminderTime.split(':').map(Number);
  const reminderDate = new Date(2000, 0, 1, hh, mm);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <ScreenHeader title={t('settings.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40, gap: 20 }}>
        {profile ? (
          <MenuGroup title={t('settings.account')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.border }}>
              {profile.avatarUrl && !avatarFailed ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={{ width: 44, height: 44, borderRadius: 22 }}
                  onError={() => setAvatarFailed(true)}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Avatar name={profile.name || profile.email} />
              )}
              <View style={{ flex: 1 }}>
                <AppText variant="rowTitle" numberOfLines={1}>
                  {profile.name || profile.email}
                </AppText>
                <AppText variant="secondary" color="secondary">
                  {profile.email ? `${profile.email} · ${t('settings.googleAccount')}` : t('settings.googleAccount')}
                </AppText>
              </View>
            </View>
            <MenuRow icon={LogOut} label={t('more.logout')} onPress={requestLogout} showChevron={false} showDivider />
            <MenuRow icon={Trash2} tone="error" label={t('settings.deleteAccount')} onPress={() => navigation.navigate('DeleteAccount')} showChevron={false} />
          </MenuGroup>
        ) : null}

        <MenuGroup title={t('settings.preferences')}>
          <MenuRow
            label={t('more.language')}
            value={settings.language === 'hi' ? t('language.hindi') : t('language.english')}
            onPress={() => rootNavigation?.navigate('Auth', { screen: 'LanguageSelect', params: { fromSettings: true } })}
            showDivider
          />
          <MenuRow label={t('settings.currency')} value={t('settings.currencyValue')} showDivider />
          <MenuRow
            label={t('settings.notifications')}
            right={<Toggle value={settings.notificationsEnabled} onValueChange={settings.setNotificationsEnabled} label={t('settings.notifications')} />}
            showDivider
          />
          <MenuRow
            label={t('settings.dailyReminder')}
            value={formatClock(settings.reminderTime, settings.language)}
            onPress={() => setShowTimePicker(true)}
            disabled={!settings.notificationsEnabled}
          />
        </MenuGroup>

        <MenuGroup title={t('settings.security')}>
          <MenuRow label={t('settings.pinLock')} right={<Toggle value={pinOn} onValueChange={handlePinToggle} label={t('settings.pinLock')} />} showDivider />
          <MenuRow
            label={t('settings.biometricLock')}
            subtitle={!biometricsAvailable ? t('lock.biometricUnavailable') : !pinOn ? t('settings.biometricNeedsPin') : undefined}
            right={
              <Toggle value={biometricOn} onValueChange={handleBiometricToggle} label={t('settings.biometricLock')} disabled={!biometricsAvailable} />
            }
            showDivider
          />
          <MenuRow label={t('settings.lockAfter')} value={lockAfterLabel} onPress={() => lockAfterSheet.current?.present()} disabled={!pinOn} />
        </MenuGroup>

        <MenuGroup title={t('settings.data')}>
          <MenuRow
            label={t('settings.syncStatus')}
            subtitle={lastSyncedAt ? t('settings.lastSynced', { time: formatSince(lastSyncedAt, t, settings.language) }) : t('settings.notSyncedYet')}
            right={<SyncStatus status={status} pendingCount={pendingCount} label={status === 'synced' ? t('sync.allSynced') : undefined} />}
            onPress={() => navigation.navigate('SyncBackup')}
            showDivider
          />
          <MenuRow
            icon={RefreshCw}
            tone="brand"
            label={t('settings.syncNow')}
            onPress={handleSyncNow}
            right={status === 'syncing' ? <ActivityIndicator color={palette.primary} /> : undefined}
            showChevron={false}
            disabled={status === 'syncing'}
            showDivider
          />
          <MenuRow label={t('settings.exportData')} value={t('settings.exportFormats')} onPress={() => navigation.navigate('Export')} showDivider />
          <MenuRow label={t('settings.backup')} value={t('settings.backupAuto')} />
        </MenuGroup>
        {offlineNotice ? <Banner variant="neutral" title={t('sync.offlineManualTitle')} body={t('sync.offlineManual')} onDismiss={() => setOfflineNotice(false)} /> : null}

        <MenuGroup title={t('settings.premium')}>
          <MenuRow
            label={t('more.subscription')}
            value={isPremium && renewsOn ? t('settings.renews', { date: renewsOn }) : t('settings.freePlan')}
            showDivider
          />
          <MenuRow tone="brand" label={t('settings.manage')} onPress={() => navigation.navigate('Premium')} showChevron />
        </MenuGroup>

        <AppText variant="caption" color="secondary" style={{ textAlign: 'center' }}>
          {t('settings.version', { version: APP_VERSION })}
        </AppText>
      </ScrollView>

      <AppBottomSheet ref={lockAfterSheet} title={t('settings.lockAfter')} onClose={() => undefined}>
        <View style={{ gap: 10 }}>
          {LOCK_AFTER_OPTIONS.map((o) => (
            <Option
              key={o.ms}
              title={t(o.key)}
              selected={settings.lockAfterMs === o.ms}
              onPress={() => {
                settings.setLockAfterMs(o.ms);
                lockAfterSheet.current?.dismiss();
              }}
            />
          ))}
        </View>
      </AppBottomSheet>

      {showTimePicker ? (
        <DateTimePicker
          value={reminderDate}
          mode="time"
          display="default"
          onChange={(event, selected) => {
            setShowTimePicker(false);
            if (event.type === 'set' && selected) settings.setReminderTime(`${pad(selected.getHours())}:${pad(selected.getMinutes())}`);
          }}
        />
      ) : null}

      <PinPromptDialog visible={confirmPinOff} onCancel={() => setConfirmPinOff(false)} onVerified={turnLockOff} />
      {logoutDialog}
    </SafeAreaView>
  );
}
