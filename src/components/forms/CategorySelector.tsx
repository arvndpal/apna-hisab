import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LayoutGrid } from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { AppText } from '../common/AppText';
import { DynamicIcon } from '../common/DynamicIcon';
import { AppBottomSheet } from '../common/BottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import type { Category, TransactionType } from '../../types/models';

const TOP_COUNT = 7;

export interface CategorySelectorProps {
  categories: Category[];
  type: TransactionType;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function Tile({ label, iconName, selected, onPress, color }: { label: string; iconName: string; selected: boolean; onPress: () => void; color: string }) {
  const palette = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={{ width: '25%', alignItems: 'center', gap: 6, paddingVertical: 5 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? `${color}1A` : palette.muted,
          borderWidth: selected ? 2 : 0,
          borderColor: color,
        }}
      >
        <DynamicIcon name={iconName} size={20} color={selected ? color : palette.textPrimary} strokeWidth={2} />
      </View>
      <AppText variant="caption" color={selected ? 'primary' : 'secondary'} style={selected ? { color } : undefined} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** 4-column grid of round tiles: top 7 by sort + a "More" tile opening the full list. */
export function CategorySelector({ categories, type, selectedId, onSelect }: CategorySelectorProps) {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const sheetRef = useRef<BottomSheetModal>(null);

  const top = categories.slice(0, TOP_COUNT);
  const rest = categories.slice(TOP_COUNT);
  const selectedInRest = rest.some((c) => c.id === selectedId);
  const color = type === 'income' ? palette.income : palette.expense;

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
        {top.map((c) => (
          <Tile
            key={c.id}
            label={categoryDisplayName(c, language)}
            iconName={c.icon}
            selected={c.id === selectedId}
            onPress={() => onSelect(c.id)}
            color={color}
          />
        ))}
        {rest.length > 0 ? (
          <Tile
            label={t('common.more')}
            iconName="LayoutGrid"
            selected={selectedInRest}
            onPress={() => sheetRef.current?.present()}
            color={color}
          />
        ) : null}
      </View>

      {rest.length > 0 ? (
        <AppBottomSheet ref={sheetRef} title={t('add.allCategories')} onClose={() => sheetRef.current?.dismiss()}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, paddingBottom: 12 }}>
            {categories.map((c) => (
              <Tile
                key={c.id}
                label={categoryDisplayName(c, language)}
                iconName={c.icon}
                selected={c.id === selectedId}
                onPress={() => {
                  onSelect(c.id);
                  sheetRef.current?.dismiss();
                }}
                color={color}
              />
            ))}
          </View>
        </AppBottomSheet>
      ) : null}
    </View>
  );
}

export { LayoutGrid as CategoryFallbackIcon };
