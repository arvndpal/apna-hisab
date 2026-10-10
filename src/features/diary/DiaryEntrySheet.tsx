import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheetTextInput, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { Check, Trash2 } from 'lucide-react-native';
import { AppBottomSheet } from '../../components/common/BottomSheet';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useTheme } from '../../hooks/useTheme';
import { showToast } from '../../store/toastStore';
import * as notesRepo from '../../database/repositories/notesRepo';
import { fontFamily, noteColors, radius, typography } from '../../theme/tokens';
import type { Note } from '../../types/models';

const TITLE_MAX = 60;
const BODY_MAX = 4000;
const SWATCH = 32;
/** Order matches theme/tokens.ts noteColors (null = default Card surface, then each swatch hex). */
const SWATCH_LABEL_KEYS = [
  'diary.colorDefault',
  'diary.colorYellow',
  'diary.colorPink',
  'diary.colorBlue',
  'diary.colorGreen',
  'diary.colorPurple',
  'diary.colorPeach',
  'diary.colorTeal',
];

export interface DiaryEntryHandle {
  /** `note` null = Add. */
  open: (note: Note | null) => void;
}

/** Add / Edit a Diary note. Opened from DiaryScreen's rows and its + button. */
export const DiaryEntrySheet = forwardRef<DiaryEntryHandle, { userId: string }>(function DiaryEntrySheetView({ userId }, ref) {
  const { t } = useTranslation();
  const palette = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (note) => {
      setEditing(note);
      setTitle(note?.title ?? '');
      setBody(note?.body ?? '');
      setColor(note?.color ?? null);
      setError(null);
      sheetRef.current?.present();
    },
  }));

  const handleSave = () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setError(t('validation.noteRequired'));
      return;
    }
    const trimmedTitle = title.trim();
    if (editing) {
      notesRepo.update(editing.id, { title: trimmedTitle || null, body: trimmedBody, color });
    } else {
      notesRepo.create({ userId, title: trimmedTitle || null, body: trimmedBody, color });
    }
    sheetRef.current?.dismiss();
    showToast({ message: t('toast.noteSaved') });
  };

  const handleDelete = () => {
    setConfirmDelete(false);
    if (!editing) return;
    notesRepo.softDelete(editing.id);
    sheetRef.current?.dismiss();
    showToast({ message: t('toast.noteDeleted') });
  };

  return (
    <>
      <AppBottomSheet
        ref={sheetRef}
        title={editing ? t('diary.edit') : t('diary.add')}
        snapPoints={['85%']}
        onClose={() => setConfirmDelete(false)}
      >
        <View style={{ gap: 8 }}>
          <BottomSheetTextInput
            value={title}
            onChangeText={(text) => setTitle(text.slice(0, TITLE_MAX))}
            maxLength={TITLE_MAX}
            placeholder={t('diary.titlePlaceholder')}
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel={t('diary.titlePlaceholder')}
            style={{
              height: 54,
              borderRadius: radius.input,
              borderWidth: 1.5,
              borderColor: palette.border,
              paddingHorizontal: 16,
              fontFamily: fontFamily[typography.body.weight],
              fontSize: 16,
              color: palette.textPrimary,
            }}
          />

          <BottomSheetTextInput
            value={body}
            onChangeText={(text) => {
              setBody(text.slice(0, BODY_MAX));
              setError(null);
            }}
            maxLength={BODY_MAX}
            multiline
            textAlignVertical="top"
            placeholder={t('diary.bodyPlaceholder')}
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel={t('diary.bodyPlaceholder')}
            style={{
              minHeight: 220,
              borderRadius: radius.input,
              borderWidth: 1.5,
              borderColor: error ? palette.error : palette.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontFamily: fontFamily[typography.body.weight],
              fontSize: 16,
              lineHeight: 22,
              color: palette.textPrimary,
            }}
          />
          {error ? (
            <AppText variant="caption" color="error" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}

          <View style={{ gap: 8 }}>
            <AppText variant="label" color="secondary">
              {t('diary.cardColor')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {noteColors.map((swatch, i) => {
                const selected = swatch === color;
                return (
                  <Pressable
                    key={swatch ?? 'default'}
                    onPress={() => setColor(swatch)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(SWATCH_LABEL_KEYS[i])}
                    hitSlop={4}
                  >
                    <View
                      style={{
                        width: SWATCH,
                        height: SWATCH,
                        borderRadius: SWATCH / 2,
                        backgroundColor: swatch ?? palette.surface,
                        borderWidth: selected ? 2 : 1.5,
                        borderColor: selected ? palette.primary : palette.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected ? <Check size={16} color={swatch ? '#1F2937' : palette.primary} strokeWidth={2.5} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            {editing ? (
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
        title={t('diary.deleteTitle')}
        body={t('diary.deleteHint')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  );
});
