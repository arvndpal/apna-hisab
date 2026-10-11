import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { Option } from '../../components/common/Option';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useTheme } from '../../hooks/useTheme';
import { useDebounce } from '../../hooks/useDebounce';
import { showToast } from '../../store/toastStore';
import * as notificationsApi from '../../services/api/notificationsApi';
import type { AdminUserResult } from '../../services/api/notificationsApi';
import { fontFamily, radius, typography } from '../../theme/tokens';

type Target = 'all' | 'user';

/**
 * Admin-only (see MoreScreen.tsx — only reachable when profile.userType === 'admin'; the backend
 * independently enforces this on every /notifications/admin/* call via AdminGuard regardless).
 */
export function SendNotificationScreen() {
  const { t } = useTranslation();
  const palette = useTheme();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<Target>('all');
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserResult | null>(null);
  const [results, setResults] = useState<AdminUserResult[]>([]);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [sending, setSending] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    notificationsApi
      .getDeviceCount()
      .then(setDeviceCount)
      .catch(() => setDeviceCount(null));
  }, []);

  useEffect(() => {
    if (target !== 'user' || selectedUser || debouncedQuery.trim().length === 0) {
      setResults([]);
      return;
    }
    let cancelled = false;
    notificationsApi
      .searchUsers(debouncedQuery.trim())
      .then((users) => {
        if (!cancelled) setResults(users);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, target, selectedUser]);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && (target === 'all' || !!selectedUser) && !sending;

  const doSend = async () => {
    setConfirmVisible(false);
    setSending(true);
    try {
      const result = await notificationsApi.sendNotification(
        title.trim(),
        body.trim(),
        target === 'all' ? { kind: 'all' } : { kind: 'user', userId: selectedUser!.id },
      );
      showToast({ message: t('admin.sendResult', { sent: result.sent, failed: result.failed }) });
      setTitle('');
      setBody('');
      setSelectedUser(null);
      setQuery('');
    } catch {
      showToast({ message: t('admin.sendFailed') });
    } finally {
      setSending(false);
    }
  };

  const handleSendPress = () => {
    if (!canSend) return;
    if (target === 'all') setConfirmVisible(true);
    else doSend();
  };

  const inputStyle = {
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: palette.border,
    paddingHorizontal: 16,
    fontFamily: fontFamily[typography.body.weight],
    fontSize: 16,
    color: palette.textPrimary,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title={t('admin.sendNotification')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <AppText variant="group" color="secondary" accessibilityRole="header">
            {t('admin.titleLabel')}
          </AppText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholder={t('admin.titlePlaceholder')}
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel={t('admin.titleLabel')}
            style={[inputStyle, { height: 54 }]}
          />
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="group" color="secondary" accessibilityRole="header">
            {t('admin.message')}
          </AppText>
          <TextInput
            value={body}
            onChangeText={setBody}
            maxLength={500}
            multiline
            textAlignVertical="top"
            placeholder={t('admin.messagePlaceholder')}
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel={t('admin.message')}
            style={[inputStyle, { minHeight: 120, paddingVertical: 12, lineHeight: 22 }]}
          />
        </View>

        <View style={{ gap: 10 }}>
          <AppText variant="group" color="secondary" accessibilityRole="header">
            {t('admin.target')}
          </AppText>
          <View style={{ gap: 10 }} accessibilityRole="radiogroup">
            <Option
              title={t('admin.targetAll')}
              subtitle={deviceCount !== null ? t('admin.targetAllSub', { count: deviceCount }) : undefined}
              selected={target === 'all'}
              onPress={() => setTarget('all')}
            />
            <Option
              title={t('admin.targetUser')}
              subtitle={selectedUser ? (selectedUser.name ?? selectedUser.email ?? undefined) : undefined}
              selected={target === 'user'}
              onPress={() => setTarget('user')}
            />
          </View>
        </View>

        {target === 'user' ? (
          <View style={{ gap: 8 }}>
            <TextInput
              value={selectedUser ? (selectedUser.name ?? selectedUser.email ?? '') : query}
              onChangeText={(text) => {
                setSelectedUser(null);
                setQuery(text);
              }}
              placeholder={t('admin.searchPlaceholder')}
              placeholderTextColor={palette.textTertiary}
              accessibilityLabel={t('admin.searchPlaceholder')}
              style={[inputStyle, { height: 54 }]}
            />
            {!selectedUser && results.length > 0 ? (
              <View style={{ borderRadius: radius.card, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' }}>
                {results.map((u, i) => (
                  <Pressable
                    key={u.id}
                    onPress={() => {
                      setSelectedUser(u);
                      setResults([]);
                    }}
                    style={({ pressed }) => ({ backgroundColor: pressed ? palette.muted : 'transparent' })}
                  >
                    <View
                      style={{
                        minHeight: 54,
                        justifyContent: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: palette.border,
                      }}
                    >
                      <AppText variant="rowTitle">{u.name ?? t('admin.unnamed')}</AppText>
                      {u.email ? (
                        <AppText variant="caption" color="secondary">
                          {u.email}
                        </AppText>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <Button label={t('admin.send')} onPress={handleSendPress} loading={sending} disabled={!canSend} />
      </View>

      <ConfirmDialog
        visible={confirmVisible}
        title={t('admin.confirmTitle')}
        body={deviceCount !== null ? t('admin.confirmBody', { count: deviceCount }) : undefined}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.send')}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={doSend}
      />
    </SafeAreaView>
  );
}
