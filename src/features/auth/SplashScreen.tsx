import React, { useCallback, useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import RNBootSplash from 'react-native-bootsplash';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { GradientSurface } from '../../components/common/GradientSurface';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import type { RootStackParamList } from '../../app/navigation/types';
import { migrate } from '../../database/migrations';
import { seedDefaultCategories } from '../../database/seed';
import { getActiveUserId } from '../../database/repositories/settingsRepo';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { useSettingsStore } from '../../store/settingsStore';
import { start as startSync } from '../../sync/syncEngine/engine';

const LOGO = require('../../../design-reference/assets/logo.png');
const MIN_VISIBLE_MS = 600;

function LoaderDot({ delay, reduceMotion }: { delay: number; reduceMotion: boolean }) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0.4);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.4, { duration: 450 })), -1, true),
    );
  }, [delay, opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }, style]}
    />
  );
}

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [dbError, setDbError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const init = useCallback(async () => {
    const start = Date.now();
    let profile = null;
    let lockMethod: 'none' | 'pin' | 'biometric' = 'none';
    try {
      // Offline-first: open SQLite, run migrations, seed default categories for the local
      // (pre-auth) user, then hydrate the auth/settings stores now that kv_settings exists.
      migrate();
      seedDefaultCategories(getActiveUserId());
      useAuthStore.getState().hydrate();
      useSettingsStore.getState().hydrate();
      useSyncStore.getState().hydrate();
      profile = useAuthStore.getState().profile;
      lockMethod = useSettingsStore.getState().lockMethod;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DB init failed', e);
      setDbError(true);
      return;
    }

    const elapsed = Date.now() - start;
    if (elapsed < MIN_VISIBLE_MS) {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), MIN_VISIBLE_MS - elapsed));
    }

    if (profile) startSync(); // fire-and-forget — never block navigation on the network

    if (!profile) {
      navigation.replace('Auth', { screen: 'Welcome' });
    } else if (lockMethod !== 'none') {
      navigation.replace('LockScreen');
    } else {
      navigation.replace('App', { screen: 'MainTabs', params: { screen: 'Home' } });
    }
  }, [navigation]);

  useEffect(() => {
    RNBootSplash.hide({ fade: true });
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <GradientSurface variant="hero" style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <Image
          source={LOGO}
          style={{
            width: 184,
            height: 184,
            borderRadius: 40,
            shadowColor: '#001410',
            shadowOpacity: 0.45,
            shadowRadius: 36,
            shadowOffset: { width: 0, height: 18 },
            elevation: 10,
          }}
          resizeMode="contain"
        />
        {dbError ? (
          <View style={{ alignItems: 'center', gap: 16, paddingHorizontal: 32 }}>
            <AppText variant="section" color="onPrimary" style={{ textAlign: 'center' }}>
              {t('errors.dbOpen')}
            </AppText>
            <Button
              label={t('common.retry')}
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                setDbError(false);
                setAttempt((a) => a + 1);
              }}
            />
          </View>
        ) : (
          <AppText variant="section" color="onPrimary" style={{ textAlign: 'center' }}>
            {t('app.tagline')}
          </AppText>
        )}
      </View>
      {!dbError && (
        <View
          style={{
            position: 'absolute',
            bottom: 56,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <LoaderDot delay={0} reduceMotion={reduceMotion} />
          <LoaderDot delay={150} reduceMotion={reduceMotion} />
          <LoaderDot delay={300} reduceMotion={reduceMotion} />
        </View>
      )}
    </GradientSurface>
  );
}
