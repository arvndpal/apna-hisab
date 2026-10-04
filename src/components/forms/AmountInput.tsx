import React, { useEffect } from 'react';
import { View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { AppText } from '../common/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { formatRawForDisplay } from '../../utils/money';

export interface AmountInputProps {
  raw: string;
  kind: 'income' | 'expense';
  label: string;
  directionCaption: string;
}

/** Centred ₹ + value + blinking caret, with a direction caption. Paired with NumericKeypad. */
export function AmountInput({ raw, kind, label, directionCaption }: AmountInputProps) {
  const palette = useTheme();
  const reduceMotion = useReduceMotion();
  const color = kind === 'income' ? palette.income : palette.expense;
  const Icon = kind === 'income' ? ArrowDownLeft : ArrowUpRight;

  const caretOpacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      caretOpacity.value = 1;
      return;
    }
    caretOpacity.value = withRepeat(withSequence(withTiming(0, { duration: 500 }), withTiming(1, { duration: 500 })), -1, true);
  }, [caretOpacity, reduceMotion]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caretOpacity.value }));

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <AppText variant="label" color="secondary">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <AppText variant="section" style={{ color, fontSize: 30, fontWeight: '700', marginBottom: 6 }}>
          ₹
        </AppText>
        <AppText variant="amountInput" style={{ color }}>
          {formatRawForDisplay(raw)}
        </AppText>
        <Animated.View style={[{ width: 3, height: 44, backgroundColor: color, marginLeft: 4, marginBottom: 6, borderRadius: 2 }, caretStyle]} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon size={14} color={color} strokeWidth={2.5} />
        <AppText variant="caption" style={{ color }}>
          {directionCaption}
        </AppText>
      </View>
    </View>
  );
}
