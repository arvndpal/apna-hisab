import React, { forwardRef, useCallback, useImperativeHandle, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { useTheme } from '../../hooks/useTheme';
import { radius } from '../../theme/tokens';
import { X } from 'lucide-react-native';

export interface AppBottomSheetProps {
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  snapPoints?: (string | number)[];
}

/**
 * @gorhom/bottom-sheet wrapper matching the design system: radius 24 top, grab handle, title row.
 * Renders via BottomSheetModal (portaled to the root BottomSheetModalProvider) rather than the
 * standalone BottomSheet, so it always fills the screen regardless of where its trigger sits in
 * the layout tree (e.g. inside a chip row) — the standalone variant absolute-fills its immediate
 * parent, which caused sheets opened from the chip row to overlap each other.
 */
export const AppBottomSheet = forwardRef<BottomSheetModal, AppBottomSheetProps>(function AppBottomSheet(
  { title, onClose, children, snapPoints },
  ref,
) {
  const palette = useTheme();
  const { t } = useTranslation();
  // Owned locally so the X button can always call the real .dismiss() directly, instead of going
  // through the consumer's onClose — see onDismiss below for why that distinction matters.
  const localRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => localRef.current as BottomSheetModal);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={localRef}
      snapPoints={snapPoints ?? ['50%']}
      enableDynamicSizing={!snapPoints}
      enablePanDownToClose
      // Fires once, after gorhom's own close animation finishes (backdrop tap, pan-down, X button,
      // or an imperative .dismiss() elsewhere) — purely a "sheet is now closed" notification.
      // Consumers must only sync their own state here, never call .dismiss() again: doing so used
      // to fire a second, redundant dismiss on an already-closed sheet, which left it unable to
      // re-present on the next open.
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: palette.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet }}
      handleIndicatorStyle={{ backgroundColor: palette.border, width: 40, height: 4 }}
    >
      <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 10 }}>
        {title ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <AppText variant="titlePushed">{title}</AppText>
            {onClose ? <IconButton icon={X} onPress={() => localRef.current?.dismiss()} accessibilityLabel={t('common.close')} /> : null}
          </View>
        ) : null}
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
