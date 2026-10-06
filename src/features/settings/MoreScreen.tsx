import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  Crown,
  Download,
  Globe,
  Info,
  Lock,
  LogOut,
  Shield,
  Tag,
  Users,
} from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { MenuGroup, MenuRow } from '../../components/common/MenuRow';
import { syncStatusColors, syncStatusLabel } from '../../components/common/SyncStatus';
import { useTheme } from '../../hooks/useTheme';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useEntitlement } from '../subscription/useEntitlement';
import { formatClock } from '../../utils/relativeTime';
import { APP_VERSION, PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '../../constants/app';
import { useLogout } from './useLogout';
import type { AppStackParamList, RootStackParamList } from '../../app/navigation/types';

/** Opens an external link, quietly doing nothing if no app can handle it (or it's still a placeholder). */
export async function openExternal(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    // No handler installed — nothing useful to show the user here.
  }
}

export function MoreScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const profile = useAuthStore((s) => s.profile);
  const language = useSettingsStore((s) => s.language);
  const lockMethod = useSettingsStore((s) => s.lockMethod);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const reminderTime = useSettingsStore((s) => s.reminderTime);
  const { status, pendingCount } = useSyncStatus();
  const { isPremium } = useEntitlement();
  const { requestLogout, dialog } = useLogout();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const lockValue = lockMethod === 'biometric' ? t('more.fingerprint') : lockMethod === 'pin' ? t('lock.pin') : t('more.off');
  const languageValue = language === 'hi' ? t('language.hindi') : t('language.english');
  const notificationsValue = notificationsEnabled ? t('more.dailyAt', { time: formatClock(reminderTime, language) }) : t('more.off');

  const openLanguage = () =>
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('Auth', { screen: 'LanguageSelect', params: { fromSettings: true } });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120, gap: 20 }}>
        <AppText variant="title" accessibilityRole="header">
          {t('more.title')}
        </AppText>

        {profile ? (
          <Card
            onPress={() => navigation.navigate('Settings')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
            accessibilityLabel={t('a11y.profile')}
          >
            {profile.avatarUrl && !avatarFailed ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={{ width: 52, height: 52, borderRadius: 26 }}
                onError={() => setAvatarFailed(true)}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Avatar name={profile.name || profile.email} size={52} />
            )}
            <View style={{ flex: 1 }}>
              <AppText variant="section" numberOfLines={1}>
                {profile.name || t('more.profile')}
              </AppText>
              <AppText variant="secondary" color="secondary" numberOfLines={1}>
                {profile.email ? `${profile.email} · ${t('more.profile')}` : t('more.profile')}
              </AppText>
            </View>
            <ChevronRight size={20} color={palette.textTertiary} />
          </Card>
        ) : null}

        {isPremium ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: palette.goldTint }}>
            <Crown size={22} color={palette.warning} />
            <AppText variant="rowTitle">{t('more.premiumActive')}</AppText>
          </View>
        ) : (
          <Pressable
            onPress={() => navigation.navigate('Premium')}
            accessibilityRole="button"
            accessibilityLabel={`${t('more.premiumCardTitle')}. ${t('more.premiumCardSub')}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 16,
              borderRadius: 18,
              // Warm Premium card colours, specified literally in SCREENS.md §18.
              backgroundColor: '#FFF9EC',
              borderWidth: 1,
              borderColor: '#F1DDB0',
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette.warningTint, alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={22} color={palette.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="rowTitle">{t('more.premiumCardTitle')}</AppText>
              <AppText variant="secondary" color="secondary">
                {t('more.premiumCardSub')}
              </AppText>
            </View>
            <ChevronRight size={20} color={palette.textTertiary} />
          </Pressable>
        )}

        <MenuGroup title={t('more.groupMoney')}>
          <MenuRow icon={Tag} label={t('more.categories')} onPress={() => navigation.navigate('Categories')} showDivider />
          <MenuRow icon={Users} label={t('more.udhaar')} onPress={() => navigation.navigate('UdhaarList')} showDivider />
          <MenuRow icon={CalendarDays} label={t('more.calendar')} onPress={() => navigation.navigate('FinancialCalendar')} />
        </MenuGroup>

        <MenuGroup title={t('more.groupPreferences')}>
          <MenuRow icon={Lock} label={t('more.appLock')} value={lockValue} onPress={() => navigation.navigate('Settings')} showDivider />
          <MenuRow icon={Globe} label={t('more.language')} value={languageValue} onPress={openLanguage} showDivider />
          <MenuRow icon={Bell} label={t('more.notifications')} value={notificationsValue} onPress={() => navigation.navigate('Settings')} />
        </MenuGroup>

        <MenuGroup title={t('more.groupData')}>
          <MenuRow
            icon={CloudUpload}
            label={t('more.syncBackup')}
            value={syncStatusLabel(t, status, pendingCount)}
            valueColor={syncStatusColors(palette)[status].fg}
            onPress={() => navigation.navigate('SyncBackup')}
            showDivider
          />
          <MenuRow icon={Download} label={t('more.export')} onPress={() => navigation.navigate('Export')} />
        </MenuGroup>

        <MenuGroup title={t('more.groupAccount')}>
          <MenuRow
            icon={Crown}
            label={t('more.subscription')}
            value={isPremium ? t('more.premium') : t('more.free')}
            onPress={() => navigation.navigate('Premium')}
            showDivider
          />
          <MenuRow icon={Shield} label={t('more.privacy')} onPress={() => openExternal(PRIVACY_POLICY_URL)} showDivider />
          <MenuRow
            icon={CircleHelp}
            label={t('more.help')}
            onPress={() => openExternal(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('more.helpSubject'))}`)}
            showDivider
          />
          <MenuRow icon={Info} label={t('more.about')} value={t('more.version', { version: APP_VERSION })} />
        </MenuGroup>

        {profile ? <Button label={t('more.logout')} variant="secondary" icon={LogOut} onPress={requestLogout} /> : null}
        {profile ? (
          <Button label={t('more.deleteAccount')} variant="ghostDanger" onPress={() => navigation.navigate('DeleteAccount')} />
        ) : null}
      </ScrollView>
      {dialog}
    </SafeAreaView>
  );
}
