import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheetTextInput, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { Trash2 } from 'lucide-react-native';
import { AppBottomSheet } from '../../components/common/BottomSheet';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DynamicIcon } from '../../components/common/DynamicIcon';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { showToast } from '../../store/toastStore';
import * as categoriesRepo from '../../database/repositories/categoriesRepo';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';
import { ICON_CHOICES, OTHER_CATEGORY_KEY } from '../../constants/categories';
import { fontFamily, radius, typography } from '../../theme/tokens';
import type { Category, TransactionType } from '../../types/models';

const NAME_MAX = 24;
const ICON_ROWS = 2;
/** Six tiles fit across a 360dp screen (20dp gutters, 8dp gaps). */
const ICON_TILE = 46;

const iconColumns: string[][] = [];
for (let i = 0; i < ICON_CHOICES.length; i += ICON_ROWS) iconColumns.push(ICON_CHOICES.slice(i, i + ICON_ROWS));

export interface CategoryEditorHandle {
  /** `category` null = Add for `type`. */
  open: (category: Category | null, type: TransactionType) => void;
}

/** Edit / Add category sheet (SCREENS.md §11). Opened from CategoriesScreen's rows and its + button. */
export const CategoryEditorSheet = forwardRef<CategoryEditorHandle, { userId: string }>(function CategoryEditorSheetView({ userId }, ref) {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const sheetRef = useRef<BottomSheetModal>(null);

  const [editing, setEditing] = useState<Category | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICON_CHOICES[0]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (category, nextType) => {
      setEditing(category);
      setType(category?.type ?? nextType);
      setName(category ? categoryDisplayName(category, language) : '');
      setIcon(category?.icon ?? 'Tag');
      setError(null);
      sheetRef.current?.present();
    },
  }));

  const accent = type === 'income' ? palette.income : palette.expense;
  const accentTint = type === 'income' ? palette.incomeTint : palette.expenseTint;
  const isOther = !!editing && editing.key === OTHER_CATEGORY_KEY[editing.type];

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('validation.nameRequired'));
      return;
    }
    if (categoriesRepo.findDuplicate(userId, type, trimmed, editing?.id)) {
      setError(t('categories.duplicate', { name: trimmed }));
      return;
    }
    if (editing) {
      // Keep a default category localized (name stays NULL) unless the user actually renamed it.
      const renamed = trimmed !== categoryDisplayName(editing, language);
      categoriesRepo.update(editing.id, { name: renamed ? trimmed : undefined, icon });
    } else {
      categoriesRepo.create({ userId, type, name: trimmed, icon });
    }
    sheetRef.current?.dismiss();
    showToast({ message: t('toast.categorySaved') });
  };

  const handleDelete = () => {
    setConfirmDelete(false);
    if (!editing) return;
    categoriesRepo.softDelete(editing.id);
    sheetRef.current?.dismiss();
    showToast({ message: t('toast.categoryDeleted') });
  };

  return (
    <>
      <AppBottomSheet ref={sheetRef} title={editing ? t('categories.edit') : t('categories.add')} onClose={() => setConfirmDelete(false)}>
        <View style={{ gap: 8 }}>
          <AppText variant="label" color="secondary">
            {t('categories.name')}
          </AppText>
          <BottomSheetTextInput
            value={name}
            onChangeText={(text) => {
              setName(text.slice(0, NAME_MAX));
              setError(null);
            }}
            maxLength={NAME_MAX}
            accessibilityLabel={t('categories.name')}
            style={{
              height: 54,
              borderRadius: radius.input,
              borderWidth: 1.5,
              borderColor: error ? palette.error : palette.primary,
              paddingHorizontal: 16,
              fontFamily: fontFamily[typography.body.weight],
              fontSize: 16,
              color: palette.textPrimary,
            }}
          />
          {error ? (
            <AppText variant="caption" color="error" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}

          <AppText variant="label" color="secondary" style={{ marginTop: 8 }}>
            {t('categories.icon')}
          </AppText>
          {/* Two rows that scroll sideways: the full icon set as a 6-column grid would push Save off a 640dp screen. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }} accessibilityRole="radiogroup">
            {iconColumns.map((column) => (
              <View key={column.join()} style={{ gap: 8, paddingHorizontal: 4 }}>
                {column.map((choice) => {
                  const selected = choice === icon;
                  return (
                    <Pressable
                      key={choice}
                      onPress={() => setIcon(choice)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={choice}
                      style={{
                        width: ICON_TILE,
                        height: 48,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? accentTint : palette.surface,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? accent : palette.border,
                      }}
                    >
                      <DynamicIcon name={choice} size={22} color={selected ? accent : palette.textPrimary} strokeWidth={2} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          {editing ? (
            <AppText variant="secondary" color="secondary" style={{ marginTop: 4 }}>
              {isOther ? t('categories.cantDeleteOther') : t('categories.deleteHint')}
            </AppText>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            {editing && !isOther ? (
              <View style={{ flex: 1 }}>
                <Button label={t('common.delete')} variant="dangerOutline" onPress={() => setConfirmDelete(true)} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button label={t('common.save')} onPress={handleSave} />
            </View>
          </View>
        </View>
      </AppBottomSheet>

      <ConfirmDialog
        visible={confirmDelete}
        icon={Trash2}
        destructive
        title={t('categories.deleteTitle', { name: editing ? categoryDisplayName(editing, language) : '' })}
        body={t('categories.deleteHint')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  );
});
