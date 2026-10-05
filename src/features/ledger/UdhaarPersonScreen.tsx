import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  MoreVertical,
  Pencil,
  CheckCircle2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../../components/common/AppText';
import { Amount } from '../../components/common/Amount';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AppBottomSheet } from '../../components/common/BottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useUdhaarPerson } from '../../hooks/useUdhaarPeople';
import { useUdhaarEntries } from '../../hooks/useUdhaarEntries';
import { useSettingsStore } from '../../store/settingsStore';
import { openUdhaarEntrySheet } from '../../store/udhaarEntrySheetStore';
import * as udhaarRepo from '../../database/repositories/udhaarRepo';
import { showToast } from '../../store/toastStore';
import { radius, typography, fontFamily } from '../../theme/tokens';
import type { AppStackParamList } from '../../app/navigation/types';
import type { UdhaarDirection } from '../../types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'UdhaarPerson'>;

const DIRECTION_STYLE: Record<UdhaarDirection, { giveLike: boolean }> = {
  given: { giveLike: true },
  paid: { giveLike: true },
  took: { giveLike: false },
  received: { giveLike: false },
};

export function UdhaarPersonScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore(s => s.language);
  const userId = useActiveUserId();
  const { personId } = route.params;

  const person = useUdhaarPerson(personId);
  const entries = useUdhaarEntries(personId);

  const overflowSheetRef = useRef<BottomSheetModal>(null);
  const editPersonSheetRef = useRef<BottomSheetModal>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [showDeletePerson, setShowDeletePerson] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  if (!person) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 16,
        }}
      >
        <AppText
          variant="body"
          color="secondary"
          style={{ textAlign: 'center' }}
        >
          {t('errors.personGone')}
        </AppText>
        <Button
          label={t('common.back')}
          variant="secondary"
          fullWidth={false}
          onPress={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const settled = person.balancePaise === 0;
  const dateLabel = (occurredOn: string) =>
    new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(`${occurredOn}T00:00:00`));

  // Which pair to show is based on actual activity, not the current balance sign — a relationship
  // that's fully settled (e.g. took ₹1,000 then paid it all back) nets to a zero balance, but the
  // Took/Paid totals are still the real ones to show, not the (genuinely zero) Given/Received pair.
  const showTookPaid =
    person.tookPaise + person.paidPaise >
    person.givenPaise + person.receivedPaise;

  const handleDeletePerson = () => {
    udhaarRepo.deletePerson(person.id);
    setShowDeletePerson(false);
    navigation.goBack();
    showToast({ message: t('toast.personDeleted') });
  };

  const handleMarkSettled = () => {
    overflowSheetRef.current?.dismiss();
    udhaarRepo.markSettled(person.id, userId);
    showToast({ message: t('udhaar.settledLong') });
  };

  const handleSaveEditPerson = () => {
    const name = editName.trim();
    if (!name) return;
    udhaarRepo.updatePerson(person.id, {
      name,
      phone: editPhone.trim() || null,
    });
    editPersonSheetRef.current?.dismiss();
  };

  const handleDeleteEntry = () => {
    if (!deleteEntryId) return;
    const id = deleteEntryId;
    udhaarRepo.softDeleteEntry(id);
    setDeleteEntryId(null);
    showToast({
      message: t('toast.udhaarEntryDeleted'),
      actionLabel: t('common.undo'),
      onAction: () => udhaarRepo.restoreEntry(id),
    });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.background }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingTop: 8,
          gap: 4,
        }}
      >
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
        />
        <AppText variant="titlePushed" style={{ flex: 1 }} numberOfLines={1}>
          {person.name}
        </AppText>
        <IconButton
          icon={MoreVertical}
          accessibilityLabel={t('common.more')}
          onPress={() => {
            setEditName(person.name);
            setEditPhone(person.phone ?? '');
            overflowSheetRef.current?.present();
          }}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Card style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
          <AppText
            variant="label"
            color="secondary"
            style={{ width: '100%', textAlign: 'center' }}
          >
            {t(
              settled
                ? 'udhaar.settledLong'
                : person.balancePaise > 0
                ? 'udhaar.willReceive'
                : 'udhaar.needToPay',
            )}
          </AppText>
          <Amount
            paise={Math.abs(person.balancePaise)}
            kind={
              settled
                ? 'neutral'
                : person.balancePaise > 0
                ? 'income'
                : 'expense'
            }
            size="XXL"
            showSign={false}
          />

          <View
            style={{
              width: '100%',
              height: 1,
              backgroundColor: palette.border,
              marginVertical: 8,
            }}
          />

          <View style={{ flexDirection: 'row', width: '100%' }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <AppText variant="caption" color="secondary">
                {t(showTookPaid ? 'udhaar.took' : 'udhaar.given')}
              </AppText>
              <Amount
                paise={showTookPaid ? person.tookPaise : person.givenPaise}
                kind="neutral"
                size="M"
              />
            </View>
            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <AppText variant="caption" color="secondary">
                {t(showTookPaid ? 'udhaar.paid' : 'udhaar.received')}
              </AppText>
              <Amount
                paise={showTookPaid ? person.paidPaise : person.receivedPaise}
                kind="neutral"
                size="M"
              />
            </View>
          </View>
        </Card>

        <AppText
          variant="caption"
          color="secondary"
          style={{ textAlign: 'center' }}
        >
          {t('udhaar.explain', { name: person.name })}
        </AppText>

        <View>
          <AppText variant="section" style={{ marginBottom: 10 }}>
            {t('udhaar.history')}
          </AppText>
          {entries.length === 0 ? (
            <AppText variant="body" color="secondary">
              {t('udhaar.noActivity')}
            </AppText>
          ) : (
            <Card padded={false} style={{ paddingHorizontal: 14 }}>
              {[...entries].reverse().map((entry, i) => {
                const giveLike = DIRECTION_STYLE[entry.direction].giveLike;
                const tint = giveLike
                  ? palette.expenseTint
                  : palette.incomeTint;
                const fg = giveLike ? palette.expense : palette.income;
                const Icon = giveLike ? ArrowUpRight : ArrowDownLeft;
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => openUdhaarEntrySheet({ editId: entry.id })}
                    onLongPress={() => setDeleteEntryId(entry.id)}
                    style={{
                      minHeight: 60,
                      paddingVertical: 11,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderBottomWidth: i < entries.length - 1 ? 1 : 0,
                      borderBottomColor: palette.border,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: tint,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} color={fg} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="rowTitle">
                        {t(`udhaar.${entry.direction}`)}
                      </AppText>
                      <AppText variant="secondary" color="secondary">
                        {dateLabel(entry.occurredOn)} ·{' '}
                        {t('udhaar.balance', {
                          amount: new Intl.NumberFormat('en-IN').format(
                            entry.runningBalancePaise / 100,
                          ),
                        })}
                      </AppText>
                    </View>
                    <Amount
                      paise={entry.amountPaise}
                      kind="neutral"
                      size="row"
                      color={giveLike ? 'expense' : 'income'}
                    />
                  </Pressable>
                );
              })}
            </Card>
          )}
        </View>
      </ScrollView>

      <AppBottomSheet
        ref={overflowSheetRef}
        title={t('common.more')}
        onClose={() => {}}
      >
        <View style={{ gap: 4 }}>
          <Pressable
            onPress={() => {
              overflowSheetRef.current?.dismiss();
              // Let this sheet's own close animation finish before presenting the next one —
              // opening a second BottomSheetModal while this one is still animating out is unreliable.
              setTimeout(() => editPersonSheetRef.current?.present(), 300);
            }}
            style={{
              minHeight: 54,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 4,
            }}
          >
            <Pencil size={20} color={palette.textPrimary} strokeWidth={2} />
            <AppText variant="rowTitle">{t('udhaar.editPerson')}</AppText>
          </Pressable>
          {!settled ? (
            <Pressable
              onPress={handleMarkSettled}
              style={{
                minHeight: 54,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 4,
              }}
            >
              <CheckCircle2
                size={20}
                color={palette.textPrimary}
                strokeWidth={2}
              />
              <AppText variant="rowTitle">{t('udhaar.markSettled')}</AppText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              overflowSheetRef.current?.dismiss();
              setShowDeletePerson(true);
            }}
            style={{
              minHeight: 54,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 4,
            }}
          >
            <Trash2 size={20} color={palette.error} strokeWidth={2} />
            <AppText variant="rowTitle" color="error">
              {t('udhaar.deletePerson')}
            </AppText>
          </Pressable>
        </View>
      </AppBottomSheet>

      <AppBottomSheet
        ref={editPersonSheetRef}
        title={t('udhaar.editPerson')}
        onClose={() => {}}
      >
        <View style={{ gap: 14 }}>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            placeholder={t('udhaar.namePlaceholder')}
            placeholderTextColor={palette.textTertiary}
            style={{
              height: 48,
              borderRadius: radius.input,
              borderWidth: 1,
              borderColor: palette.border,
              paddingHorizontal: 14,
              fontFamily: fontFamily[typography.body.weight],
              fontSize: typography.body.size,
              color: palette.textPrimary,
            }}
          />
          <TextInput
            value={editPhone}
            onChangeText={setEditPhone}
            placeholder={t('udhaar.phonePlaceholder')}
            placeholderTextColor={palette.textTertiary}
            keyboardType="phone-pad"
            style={{
              height: 48,
              borderRadius: radius.input,
              borderWidth: 1,
              borderColor: palette.border,
              paddingHorizontal: 14,
              fontFamily: fontFamily[typography.body.weight],
              fontSize: typography.body.size,
              color: palette.textPrimary,
            }}
          />
          <Button label={t('common.save')} onPress={handleSaveEditPerson} />
        </View>
      </AppBottomSheet>

      <ConfirmDialog
        visible={showDeletePerson}
        icon={Trash2}
        destructive
        title={t('udhaar.deletePersonTitle', { name: person.name })}
        body={t('udhaar.deletePersonBody')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={() => setShowDeletePerson(false)}
        onConfirm={handleDeletePerson}
      />

      <ConfirmDialog
        visible={!!deleteEntryId}
        icon={Trash2}
        destructive
        title={t('udhaar.deleteEntryTitle')}
        body={t('udhaar.deleteEntryBody')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={() => setDeleteEntryId(null)}
        onConfirm={handleDeleteEntry}
      />
    </SafeAreaView>
  );
}
