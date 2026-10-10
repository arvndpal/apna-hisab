import React, { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Download, FileText, type LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';
import { radius, shadows } from '../../theme/tokens';

export interface ExportMenuItem {
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
}

const ICON_BOX = 32;
const MENU_WIDTH = 210;

/**
 * Export icon for a card header that opens a small dropdown anchored under it (e.g. "Export as
 * PDF"). Drawn at 32dp to fit beside a chart title and legend; hitSlop keeps the 44dp touch target.
 * Shows a spinner instead of the icon while an export is running.
 */
export function ExportMenu({ items, busy, accessibilityLabel }: { items: ExportMenuItem[]; busy?: boolean; accessibilityLabel?: string }) {
  const { t } = useTranslation();
  const palette = useTheme();
  const anchorRef = useRef<React.ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const open = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  };
  const close = () => setAnchor(null);

  return (
    <>
      <Pressable
        ref={anchorRef}
        onPress={busy ? undefined : open}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? t('export.export')}
        accessibilityState={{ busy: !!busy, expanded: anchor !== null }}
        style={({ pressed }) => ({
          width: ICON_BOX,
          height: ICON_BOX,
          borderRadius: radius.buttonSm,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: pressed ? palette.muted : palette.surface,
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {busy ? <ActivityIndicator size="small" color={palette.primary} /> : <Download size={17} color={palette.textPrimary} strokeWidth={2} />}
      </Pressable>

      {/* statusBarTranslucent: measureInWindow counts from the top of the screen, so the modal must too. */}
      <Modal visible={anchor !== null} transparent statusBarTranslucent animationType="fade" onRequestClose={close}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel={t('common.close')}>
          {anchor ? (
            <View
              accessibilityRole="menu"
              style={{
                position: 'absolute',
                top: anchor.y + anchor.height + 6,
                // Right-aligned to the icon, so the menu opens inward from the card edge.
                left: Math.max(8, anchor.x + anchor.width - MENU_WIDTH),
                width: MENU_WIDTH,
                backgroundColor: palette.surface,
                borderRadius: radius.card - 4,
                paddingVertical: 6,
                ...shadows.lg,
              }}
            >
              {items.map((item) => {
                const Icon = item.icon ?? FileText;
                return (
                  <Pressable
                    key={item.label}
                    accessibilityRole="menuitem"
                    onPress={() => {
                      close();
                      item.onPress();
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? palette.muted : 'transparent',
                    })}
                  >
                    {/* Flex-row layout lives on a plain View, not the Pressable's own (function-valued)
                        style — putting flexDirection/gap directly on Pressable's style here collapses to
                        a column on device (icon stacked above the label) instead of laying out as a row. */}
                    <View style={{ minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Icon size={18} color={palette.primary} strokeWidth={2} />
                      <AppText variant="rowTitle">{item.label}</AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
