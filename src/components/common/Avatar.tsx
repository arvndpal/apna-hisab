import React from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';

export interface AvatarProps {
  name: string;
  size?: number;
  settled?: boolean;
}

/** 40 circle (52 on profile), udhaarTint bg, initial. Settled person uses a muted bg instead. */
export function Avatar({ name, size = 40, settled }: AvatarProps) {
  const palette = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: settled ? palette.muted : palette.udhaarTint,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="rowTitle" color={settled ? 'secondary' : 'primary'} style={{ color: settled ? palette.textSecondary : palette.udhaar }}>
        {initial}
      </AppText>
    </View>
  );
}
