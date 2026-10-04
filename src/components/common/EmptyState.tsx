import React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { Button, type ButtonProps } from './Button';
import { useTheme } from '../../hooks/useTheme';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  actions?: Array<Pick<ButtonProps, 'label' | 'onPress' | 'variant'>>;
}

/** Centred art tile + title + body + up to 2 full-width buttons. */
export function EmptyState({ icon: Icon, title, body, actions }: EmptyStateProps) {
  const palette = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 16 }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 28,
          backgroundColor: palette.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={44} color={palette.primary} strokeWidth={1.75} />
      </View>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <AppText variant="titlePushed" style={{ textAlign: 'center' }}>
          {title}
        </AppText>
        <AppText variant="body" color="secondary" style={{ textAlign: 'center' }}>
          {body}
        </AppText>
      </View>
      {actions?.length ? (
        <View style={{ width: '100%', gap: 10 }}>
          {actions.map((a) => (
            <Button key={a.label} {...a} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
