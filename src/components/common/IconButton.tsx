import React from 'react';
import { Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { radius, layout } from '../../theme/tokens';

export interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  outlined?: boolean;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  testID?: string;
}

/** 44×44, radius 12. `outlined` adds a white bg + border (used on gradient/photo backgrounds). */
export function IconButton({
  icon: Icon,
  onPress,
  outlined,
  accessibilityLabel,
  color,
  size = 22,
  testID,
}: IconButtonProps) {
  const palette = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} testID={testID}>
      {({ pressed }) => (
        <View
          style={{
            width: layout.touchMin,
            height: layout.touchMin,
            borderRadius: radius.iconButton,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: outlined ? palette.surface : 'transparent',
            borderWidth: outlined ? 1 : 0,
            borderColor: palette.border,
            opacity: pressed ? 0.6 : 1,
          }}
        >
          <Icon size={size} color={color ?? palette.textPrimary} strokeWidth={2} />
        </View>
      )}
    </Pressable>
  );
}
