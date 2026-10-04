import React, { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, FileText } from 'lucide-react-native';
import type BottomSheetLib from '@gorhom/bottom-sheet';
import { Chip } from '../common/Chip';
import { Button } from '../common/Button';
import { AppBottomSheet } from '../common/BottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { radius, typography, fontFamily } from '../../theme/tokens';

const MAX_LENGTH = 120;

export interface NoteChipProps {
  value: string;
  onChange: (note: string) => void;
}

export function NoteChip({ value, onChange }: NoteChipProps) {
  const { t } = useTranslation();
  const palette = useTheme();
  const sheetRef = useRef<BottomSheetLib>(null);
  const [draft, setDraft] = useState(value);

  return (
    <>
      <Chip
        label={value || t('common.addNote')}
        icon={value ? FileText : Plus}
        selected={!!value}
        onPress={() => {
          setDraft(value);
          sheetRef.current?.expand();
        }}
      />
      <AppBottomSheet ref={sheetRef} title={t('common.note')} onClose={() => sheetRef.current?.close()}>
        <View style={{ gap: 16 }}>
          <TextInput
            value={draft}
            onChangeText={(text) => setDraft(text.slice(0, MAX_LENGTH))}
            placeholder={t('common.addNote')}
            placeholderTextColor={palette.textTertiary}
            maxLength={MAX_LENGTH}
            multiline
            style={{
              minHeight: 80,
              borderWidth: 1.5,
              borderColor: palette.border,
              borderRadius: radius.input,
              padding: 14,
              fontFamily: fontFamily[typography.body.weight],
              fontSize: typography.body.size,
              color: palette.textPrimary,
              textAlignVertical: 'top',
            }}
          />
          <Button
            label={t('common.save')}
            onPress={() => {
              onChange(draft.trim());
              sheetRef.current?.close();
            }}
          />
        </View>
      </AppBottomSheet>
    </>
  );
}
