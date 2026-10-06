import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { DynamicIcon } from '../../components/common/DynamicIcon';
import { IconButton } from '../../components/common/IconButton';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useCategories } from '../../hooks/useCategories';
import { useSettingsStore } from '../../store/settingsStore';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import { CategoryEditorSheet, type CategoryEditorHandle } from './CategoryEditorSheet';
import type { TransactionType } from '../../types/models';

/** SCREENS.md §11. Drag-to-reorder is not built yet; rows keep their stored `sort` order. */
export function CategoriesScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const userId = useActiveUserId();
  const editorRef = useRef<CategoryEditorHandle>(null);
  const [type, setType] = useState<TransactionType>('expense');

  const income = useCategories(userId, 'income');
  const expense = useCategories(userId, 'expense');
  const categories = type === 'income' ? income : expense;
  const accent = type === 'income' ? palette.income : palette.expense;
  const accentTint = type === 'income' ? palette.incomeTint : palette.expenseTint;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={t('categories.title')}
        right={<IconButton icon={Plus} accessibilityLabel={t('categories.add')} onPress={() => editorRef.current?.open(null, type)} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40, gap: 16 }}>
        <SegmentedControl
          segments={[
            { value: 'income', label: t('categories.income', { count: income.length }) },
            { value: 'expense', label: t('categories.expense', { count: expense.length }) },
          ]}
          value={type}
          onChange={(v) => setType(v as TransactionType)}
        />

        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {categories.map((category, i) => {
            const label = categoryDisplayName(category, language);
            return (
              <Pressable
                key={category.id}
                onPress={() => editorRef.current?.open(category, type)}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${t('categories.edit')}`}
                style={{
                  minHeight: 68,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  borderBottomWidth: i < categories.length - 1 ? 1 : 0,
                  borderBottomColor: palette.border,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: accentTint, alignItems: 'center', justifyContent: 'center' }}>
                  <DynamicIcon name={category.icon} size={20} color={accent} strokeWidth={2} />
                </View>
                <AppText variant="rowTitle" style={{ flex: 1 }}>
                  {label}
                </AppText>
                <View importantForAccessibility="no-hide-descendants" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={20} color={palette.textPrimary} strokeWidth={2} />
                </View>
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>

      <CategoryEditorSheet ref={editorRef} userId={userId} />
    </SafeAreaView>
  );
}
