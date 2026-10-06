import React, { useEffect, useState } from 'react';
import { Modal, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../hooks/useTheme';
import { verifyPin } from '../../services/security/lock';
import { fontFamily, radius, shadows } from '../../theme/tokens';

const PIN_LENGTH = 4;

/** "Confirm PIN to disable" (SCREENS.md §19 Security). Verifies as soon as 4 digits are typed. */
export function PinPromptDialog({ visible, onCancel, onVerified }: { visible: boolean; onCancel: () => void; onVerified: () => void }) {
  const { t } = useTranslation();
  const palette = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (visible) {
      setPin('');
      setError(false);
    }
  }, [visible]);

  const handleChange = async (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    setError(false);
    if (digits.length === PIN_LENGTH) {
      if (await verifyPin(digits)) {
        onVerified();
      } else {
        setError(true);
        setPin('');
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: palette.scrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: '100%', borderRadius: radius.dialog, backgroundColor: palette.surface, padding: 24, gap: 14, alignItems: 'center', ...shadows.lg }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: palette.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={24} color={palette.primary} />
          </View>
          <AppText variant="section" accessibilityRole="header">
            {t('lock.enterPin')}
          </AppText>
          <TextInput
            value={pin}
            onChangeText={handleChange}
            autoFocus
            secureTextEntry
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            accessibilityLabel={t('lock.enterPin')}
            style={{
              width: 160,
              height: 54,
              borderRadius: radius.input,
              borderWidth: 1.5,
              borderColor: error ? palette.error : palette.border,
              textAlign: 'center',
              letterSpacing: 12,
              fontSize: 24,
              fontFamily: fontFamily[700],
              color: palette.textPrimary,
            }}
          />
          {error ? (
            <AppText variant="caption" color="error" accessibilityLiveRegion="polite">
              {t('lock.wrongPin')}
            </AppText>
          ) : null}
          <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
