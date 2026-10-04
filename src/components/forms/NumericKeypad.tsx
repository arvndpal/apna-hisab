import React from 'react';
import { Dimensions, Pressable, Vibration, View } from 'react-native';
import { Delete } from 'lucide-react-native';
import { AppText } from '../common/AppText';
import { useTheme } from '../../hooks/useTheme';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
] as const;

const SIDE_PADDING = 16;
const KEY_MARGIN = 1;

export interface NumericKeypadProps {
  onKeyPress: (key: string) => void;
  onClear: () => void;
  compact?: boolean;
}

/** Flat 3-column grid, in-app so it never covers the Save button. Long-press backspace clears. */
export function NumericKeypad({ onKeyPress, onClear, compact }: NumericKeypadProps) {
  const palette = useTheme();
  const keyHeight = compact ? 44 : 54;
  const screenWidth = Dimensions.get('window').width;
  const keyWidth = (screenWidth - SIDE_PADDING * 2) / 3 - KEY_MARGIN * 2;

  return (
    <View style={{ paddingHorizontal: SIDE_PADDING }}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row' }}>
          {row.map((key) => (
            <Pressable
              key={key}
              onPress={() => {
                Vibration.vibrate(8);
                onKeyPress(key);
              }}
              onLongPress={key === 'backspace' ? onClear : undefined}
              accessibilityRole="button"
              accessibilityLabel={key === 'backspace' ? 'Delete' : key}
            >
              {({ pressed }) => (
                <View
                  style={{
                    width: keyWidth,
                    height: keyHeight,
                    margin: KEY_MARGIN,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed ? palette.muted : 'transparent',
                  }}
                >
                  {key === 'backspace' ? (
                    <Delete size={24} color={palette.textPrimary} strokeWidth={2} />
                  ) : (
                    <AppText variant="title" style={{ fontVariant: ['tabular-nums'] }}>
                      {key}
                    </AppText>
                  )}
                </View>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
