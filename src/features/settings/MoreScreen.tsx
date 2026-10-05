import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LogOut } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import * as syncQueueRepo from '../../database/repositories/syncQueueRepo';
import type { RootStackParamList } from '../../app/navigation/types';

export function MoreScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const goToWelcome = () => {
    navigation
      .getParent()
      ?.getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Welcome' } }] });
  };

  const handleLogout = async () => {
    const pending = syncQueueRepo.count();
    if (pending > 0) {
      setUnsyncedCount(pending);
      setShowLogoutConfirm(true);
      return;
    }
    await signOut();
    goToWelcome();
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    goToWelcome();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 20 }}>
        <AppText variant="title">{t('more.title')}</AppText>

        {profile ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {profile.avatarUrl && !avatarFailed ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={{ width: 52, height: 52, borderRadius: 26 }}
                onError={() => setAvatarFailed(true)}
                accessibilityLabel={profile.name || profile.email}
              />
            ) : (
              <Avatar name={profile.name || profile.email} size={52} />
            )}
            <View style={{ flex: 1 }}>
              <AppText variant="section" numberOfLines={1}>
                {profile.name || t('more.profile')}
              </AppText>
              <AppText variant="secondary" color="secondary" numberOfLines={1}>
                {profile.email}
              </AppText>
            </View>
          </Card>
        ) : null}

        <Button label={t('more.logout')} variant="dangerOutline" icon={LogOut} onPress={handleLogout} />
      </View>

      <ConfirmDialog
        visible={showLogoutConfirm}
        icon={LogOut}
        destructive
        title={t('logout.title')}
        body={t('logout.unsynced', { count: unsyncedCount })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('logout.confirm')}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
      />
    </SafeAreaView>
  );
}
