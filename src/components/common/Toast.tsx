import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { AppText } from './AppText';
import { useToastStore } from '../../store/toastStore';
import { motion, radius } from '../../theme/tokens';

const TOAST_BG = '#14201C';
const TOAST_ACCENT = '#7BD8A4';

/** Mounted once in AppProviders. Renders the current toast above the bottom nav, if any. */
export function Toast() {
  const current = useToastStore((s) => s.current);
  const hide = useToastStore((s) => s.hide);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!current) return;
    AccessibilityInfo.announceForAccessibility(current.message);
    if (timer.current) clearTimeout(timer.current);
    const duration = current.durationMs ?? (current.actionLabel ? motion.toastHoldUndo : motion.toastHold);
    timer.current = setTimeout(hide, duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [current, hide]);

  if (!current) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 90,
        backgroundColor: TOAST_BG,
        borderRadius: radius.toast,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Check size={18} color={TOAST_ACCENT} strokeWidth={2.5} />
      <AppText variant="rowTitle" color="onPrimary" style={{ flex: 1 }}>
        {current.message}
      </AppText>
      {current.actionLabel ? (
        <Pressable
          onPress={() => {
            current.onAction?.();
            hide();
          }}
          hitSlop={8}
        >
          <AppText variant="rowTitle" style={{ color: TOAST_ACCENT }}>
            {current.actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
