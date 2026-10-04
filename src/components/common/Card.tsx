import React from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { radius, shadows, layout } from '../../theme/tokens';
import { useTheme } from '../../hooks/useTheme';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  padded?: boolean;
  testID?: string;
}

/** Surface, no border, radius 18, shadowCard. Lists of rows live inside with dividers between. */
export function Card({ onPress, padded = true, style, children, testID, ...rest }: CardProps) {
  const palette = useTheme();
  const base = {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: padded ? layout.cardPadding : 0,
    ...shadows.card,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: palette.muted }}
        style={[base, style]}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[base, style]} testID={testID} {...rest}>
      {children}
    </View>
  );
}
