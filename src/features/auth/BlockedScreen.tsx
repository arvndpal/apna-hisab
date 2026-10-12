import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldX } from 'lucide-react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';

/**
 * Shown instead of every other App-stack screen while profile.isBlocked — see AppNavigator, which
 * gates the whole stack on this rather than each screen checking it individually.
 */
export function BlockedScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon={ShieldX}
          title={t('home.blockedTitle')}
          body={profile?.blockedReason || t('home.blockedBody')}
          actions={[{ label: t('home.blockedLogout'), variant: 'secondary', onPress: signOut }]}
        />
      </View>
    </SafeAreaView>
  );
}
