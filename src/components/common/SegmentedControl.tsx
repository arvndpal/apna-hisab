import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText, type AppTextColor } from './AppText';
import { useTheme } from '../../hooks/useTheme';
import { shadows } from '../../theme/tokens';

export interface Segment {
  value: string;
  label: string;
  color?: AppTextColor;
}

export interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

/** Track muted, radius 12, padding 4; segments radius 9, selected = white + subtle shadow. */
export function SegmentedControl({ segments, value, onChange, testID }: SegmentedControlProps) {
  const palette = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: palette.muted,
        borderRadius: 12,
        padding: 4,
      }}
      testID={testID}
    >
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <Pressable
            key={seg.value}
            onPress={() => onChange(seg.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? palette.surface : 'transparent',
              ...(active ? shadows.card : {}),
            }}
          >
            <AppText variant="label" color={active ? (seg.color ?? 'primary') : 'secondary'}>
              {seg.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface IncomeExpenseToggleProps {
  value: 'income' | 'expense';
  onChange: (value: 'income' | 'expense') => void;
  incomeLabel: string;
  expenseLabel: string;
}

export function IncomeExpenseToggle({ value, onChange, incomeLabel, expenseLabel }: IncomeExpenseToggleProps) {
  return (
    <View style={{ maxWidth: 250, width: '100%' }}>
      <SegmentedControl
        value={value}
        onChange={(v) => onChange(v as 'income' | 'expense')}
        segments={[
          { value: 'income', label: incomeLabel, color: 'income' },
          { value: 'expense', label: expenseLabel, color: 'expense' },
        ]}
      />
    </View>
  );
}
