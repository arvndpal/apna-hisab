import React from 'react';
import { Switch } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

/** Design-system switch: primary track when on. The row label is passed for TalkBack. */
export function Toggle({ value, onValueChange, label, disabled }: { value: boolean; onValueChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  const palette = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="switch"
      trackColor={{ false: palette.mutedStrong, true: palette.primary }}
      thumbColor={palette.surface}
      ios_backgroundColor={palette.mutedStrong}
    />
  );
}
