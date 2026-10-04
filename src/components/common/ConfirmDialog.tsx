import React from 'react';
import { Modal, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { useTheme } from '../../hooks/useTheme';
import { radius, shadows } from '../../theme/tokens';

export interface ConfirmDialogProps {
  visible: boolean;
  icon?: LucideIcon;
  destructive?: boolean;
  title: string;
  body?: string;
  summary?: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Width = screen − 48, radius 22. Used for destructive confirmations (delete transaction, etc). */
export function ConfirmDialog({
  visible,
  icon: Icon,
  destructive,
  title,
  body,
  summary,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const palette = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: palette.scrim,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            borderRadius: radius.dialog,
            backgroundColor: palette.surface,
            padding: 24,
            paddingTop: 20,
            paddingBottom: 20,
            alignItems: 'center',
            gap: 14,
            ...shadows.lg,
          }}
        >
          {Icon ? (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: destructive ? palette.errorTint : palette.primaryTint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={24} color={destructive ? palette.error : palette.primary} strokeWidth={2} />
            </View>
          ) : null}
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {title}
          </AppText>
          {summary ? (
            <View style={{ width: '100%', backgroundColor: palette.background, borderRadius: 12, padding: 14 }}>
              {summary}
            </View>
          ) : null}
          {body ? (
            <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
              {body}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <View style={{ flex: 1 }}>
              <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
