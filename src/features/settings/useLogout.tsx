import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LogOut } from 'lucide-react-native';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuthStore } from '../../store/authStore';
import * as syncQueueRepo from '../../database/repositories/syncQueueRepo';
import type { RootStackParamList } from '../../app/navigation/types';

/** Resets the whole app back to Welcome — works from any depth (tabs, App stack screens). */
export function useResetToWelcome() {
  const navigation = useNavigation();
  return () => {
    let root = navigation;
    while (root.getParent()) root = root.getParent()!;
    (root as NativeStackNavigationProp<RootStackParamList>).reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Welcome' } }] });
  };
}

/**
 * Logout shared by More and Settings (SCREENS.md §18): confirm only if unsynced rows exist, then
 * clear local data and go to Welcome. Render `dialog` once in the screen.
 */
export function useLogout() {
  const { t } = useTranslation();
  const signOut = useAuthStore((s) => s.signOut);
  const resetToWelcome = useResetToWelcome();
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const doLogout = async () => {
    setUnsyncedCount(0);
    await signOut();
    resetToWelcome();
  };

  const requestLogout = () => {
    const pending = syncQueueRepo.count();
    if (pending > 0) setUnsyncedCount(pending);
    else doLogout();
  };

  const dialog = (
    <ConfirmDialog
      visible={unsyncedCount > 0}
      icon={LogOut}
      destructive
      title={t('logout.title')}
      body={t('logout.unsynced', { count: unsyncedCount })}
      cancelLabel={t('common.cancel')}
      confirmLabel={t('logout.confirm')}
      onCancel={() => setUnsyncedCount(0)}
      onConfirm={doLogout}
    />
  );

  return { requestLogout, dialog };
}
