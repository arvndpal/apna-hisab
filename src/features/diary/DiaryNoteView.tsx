import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { IconButton } from '../../components/common/IconButton';
import { useTheme } from '../../hooks/useTheme';
import { formatNoteStamp } from './noteFormat';
import type { Language, Note } from '../../types/models';

/** Full-page read-only view of one note — SCREENS.md has no entry for Diary, built per explicit request. */
export function DiaryNoteView({ note, language, onClose }: { note: Note | null; language: Language; onClose: () => void }) {
  const { t } = useTranslation();
  const palette = useTheme();

  // Keeps the last-viewed note rendered while the Modal plays its close animation — `note` itself
  // goes null immediately on close, which would otherwise blank the content mid-slide-out.
  const [displayed, setDisplayed] = useState<Note | null>(note);
  useEffect(() => {
    if (note) setDisplayed(note);
  }, [note]);

  return (
    <Modal visible={!!note} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: displayed?.color ?? palette.background }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 12, paddingVertical: 8 }}>
          <IconButton icon={X} accessibilityLabel={t('common.close')} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}>
          {displayed?.title ? (
            <AppText variant="display" style={{ fontSize: 24, lineHeight: 30 }} accessibilityRole="header">
              {displayed.title}
            </AppText>
          ) : null}
          {displayed ? (
            <AppText variant="caption" color="secondary">
              {formatNoteStamp(displayed.updatedAt, language)}
            </AppText>
          ) : null}
          <AppText variant="body" style={{ fontSize: 16, lineHeight: 24 }}>
            {displayed?.body}
          </AppText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
