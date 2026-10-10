import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Eye, NotebookPen, Pencil, Plus } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { GradientSurface } from '../../components/common/GradientSurface';
import { IconButton } from '../../components/common/IconButton';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useNotes } from '../../hooks/useNotes';
import { useSettingsStore } from '../../store/settingsStore';
import { layout, shadows } from '../../theme/tokens';
import { DiaryEntrySheet, type DiaryEntryHandle } from './DiaryEntrySheet';
import { DiaryNoteView } from './DiaryNoteView';
import { formatNoteStamp } from './noteFormat';
import type { Note } from '../../types/models';

/** Diary tab: simple personal notes — add, edit, delete. Not part of money tracking (no sync into reports/export). */
export function DiaryScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const userId = useActiveUserId();
  const notes = useNotes(userId);
  const sheetRef = useRef<DiaryEntryHandle>(null);
  const [viewing, setViewing] = useState<Note | null>(null);

  const openNote = (note: Note | null) => sheetRef.current?.open(note);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        <AppText variant="title">{t('diary.title')}</AppText>
      </View>

      {notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={t('empty.diary.title')}
          body={t('empty.diary.body')}
          actions={[{ label: t('diary.add'), onPress: () => openNote(null) }]}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100, gap: 12 }}>
          {notes.map((note) => (
            <Card key={note.id} style={note.color ? { backgroundColor: note.color } : undefined}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="rowTitle" numberOfLines={note.title ? 1 : 2}>
                    {note.title || note.body}
                  </AppText>
                  {note.title ? (
                    <AppText variant="secondary" color="secondary" numberOfLines={2}>
                      {note.body}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" color="secondary" style={{ marginTop: 4 }}>
                    {formatNoteStamp(note.updatedAt, language)}
                  </AppText>
                </View>
                <View style={{ gap: 2 }}>
                  <IconButton icon={Eye} size={20} accessibilityLabel={t('diary.view')} onPress={() => setViewing(note)} />
                  <IconButton icon={Pencil} size={20} accessibilityLabel={t('diary.edit')} onPress={() => openNote(note)} />
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      <Pressable
        onPress={() => openNote(null)}
        accessibilityRole="button"
        accessibilityLabel={t('diary.add')}
        style={{ position: 'absolute', right: 20, bottom: 64, width: layout.fab, height: layout.fab, borderRadius: layout.fab / 2, ...shadows.fab }}
      >
        <GradientSurface variant="fab" style={{ flex: 1, borderRadius: layout.fab / 2, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </GradientSurface>
      </Pressable>

      <DiaryEntrySheet ref={sheetRef} userId={userId} />
      <DiaryNoteView note={viewing} language={language} onClose={() => setViewing(null)} />
    </SafeAreaView>
  );
}
