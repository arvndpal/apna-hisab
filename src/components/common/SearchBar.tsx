import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { radius, typography, fontFamily } from '../../theme/tokens';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  testID?: string;
}

/** Input variant, height 48, leading Search icon, clear button when non-empty. */
export function SearchBar({ value, onChangeText, placeholder, testID }: SearchBarProps) {
  const palette = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={{
        height: 48,
        borderRadius: radius.input,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 8,
      }}
    >
      <Search size={18} color={palette.textTertiary} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textTertiary}
        style={{
          flex: 1,
          fontFamily: fontFamily[typography.body.weight],
          fontSize: typography.body.size,
          color: palette.textPrimary,
          padding: 0,
        }}
        testID={testID}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel={t('common.clearSearch')} hitSlop={8}>
          <X size={18} color={palette.textTertiary} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}
