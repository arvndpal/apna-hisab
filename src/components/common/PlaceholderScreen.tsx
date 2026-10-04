import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';

/** Milestone 1 stand-in. Replaced screen by screen in the milestones that build them, per CLAUDE.md's build order. */
export function PlaceholderScreen({ title }: { title: string }) {
  const palette = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="secondary" color="secondary">
          Coming in a later milestone
        </AppText>
      </View>
    </SafeAreaView>
  );
}
