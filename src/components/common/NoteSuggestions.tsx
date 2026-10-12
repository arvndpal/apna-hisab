import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';
import { radius } from '../../theme/tokens';

/** Case-insensitive "contains" match against notes typed before, newest-used first, minus an exact repeat of what's already typed. */
export function filterNoteSuggestions(all: string[], query: string, limit = 5): string[] {
  const q = query.trim().toLowerCase();
  const pool = q ? all.filter((note) => note.toLowerCase().includes(q) && note.toLowerCase() !== q) : all;
  return pool.slice(0, limit);
}

/** Dropdown of past notes shown under a note input while it's focused — same look as the Udhaar person-name suggestions list. */
export function NoteSuggestions({ suggestions, onSelect }: { suggestions: string[]; onSelect: (note: string) => void }) {
  const palette = useTheme();
  if (suggestions.length === 0) return null;
  return (
    <View
      style={{
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: palette.border,
        overflow: 'hidden',
      }}
    >
      {suggestions.map((note, i) => (
        <Pressable
          key={note}
          onPress={() => onSelect(note)}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
            borderBottomColor: palette.border,
          }}
        >
          <AppText variant="rowTitle" numberOfLines={1}>
            {note}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
