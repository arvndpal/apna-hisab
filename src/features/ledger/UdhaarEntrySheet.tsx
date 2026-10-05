import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Calendar,
} from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppBottomSheet } from '../../components/common/BottomSheet';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useUdhaarPeople } from '../../hooks/useUdhaarPeople';
import * as udhaarRepo from '../../database/repositories/udhaarRepo';
import {
  registerUdhaarEntrySheet,
  type UdhaarEntrySheetParams,
} from '../../store/udhaarEntrySheetStore';
import { showToast } from '../../store/toastStore';
import { useSettingsStore } from '../../store/settingsStore';
import { radius, typography, fontFamily } from '../../theme/tokens';
import { MAX_AMOUNT_PAISE, paiseToRaw, rawToPaise } from '../../utils/money';
import { toOccurredOn } from '../../utils/dates';
import type { UdhaarDirection } from '../../types/models';

function sameDay(a: Date, b: Date): boolean {
  return toOccurredOn(a) === toOccurredOn(b);
}

function withTimeOf(date: Date, timeSource: Date): Date {
  const next = new Date(date);
  next.setHours(
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    0,
  );
  return next;
}

/** Keeps at most one '.', at most 2 decimals, no leading zeros, and caps at MAX_AMOUNT_PAISE. */
function sanitizeAmountText(previous: string, next: string): string {
  let cleaned = next.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1)
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, '');
  const [int, dec] = cleaned.split('.');
  const trimmedInt = (int ?? '').replace(/^0+(?=\d)/, '');
  const candidate =
    dec !== undefined ? `${trimmedInt}.${dec.slice(0, 2)}` : trimmedInt;
  if (candidate !== '' && rawToPaise(candidate) > MAX_AMOUNT_PAISE)
    return previous;
  return candidate;
}

function DirectionCard({
  icon: Icon,
  tint,
  color,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: typeof ArrowUpRight;
  tint: string;
  color: string;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        flex: 1,
        minHeight: 84,
        borderRadius: radius.card,
        borderWidth: 1.5,
        borderColor: selected ? color : palette.border,
        backgroundColor: selected ? tint : palette.surface,
        padding: 12,
        gap: 6,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={color} strokeWidth={2} />
      </View>
      <AppText variant="label">{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" color="secondary">
          {subtitle}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Mounted once (in MainTabs); opened from anywhere via registerUdhaarEntrySheet/openUdhaarEntrySheet (udhaarEntrySheetStore.ts). */
export function UdhaarEntrySheet() {
  const { t } = useTranslation();
  const palette = useTheme();
  const userId = useActiveUserId();
  const sheetRef = useRef<BottomSheetModal>(null);
  // Remembered purely so handleSave knows whether it's editing an existing entry — set
  // synchronously by present(), not driven by React state (see registerUdhaarEntrySheet below).
  const currentParams = useRef<UdhaarEntrySheetParams>({});

  const [personQuery, setPersonQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personLocked, setPersonLocked] = useState(false);
  const [direction, setDirection] = useState<UdhaarDirection>('given');
  const [raw, setRaw] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showNativePicker, setShowNativePicker] = useState(false);
  const language = useSettingsStore(s => s.language);

  useEffect(() => {
    registerUdhaarEntrySheet({
      present: params => {
        currentParams.current = params;
        setError(null);
        setEditId(params.editId ?? null);
        setShowNativePicker(false);

        if (params.editId) {
          const entry = udhaarRepo.getEntry(params.editId);
          const person = entry ? udhaarRepo.getPerson(entry.personId) : null;
          setSelectedPersonId(entry?.personId ?? null);
          setPersonQuery(person?.name ?? '');
          setPersonLocked(true);
          setDirection(entry?.direction ?? 'given');
          setRaw(entry ? paiseToRaw(entry.amountPaise) : '');
          setOccurredAt(entry ? new Date(entry.occurredAt) : new Date());
          setNote(entry?.note ?? '');
        } else {
          const presetPerson = params.personId
            ? udhaarRepo.getPerson(params.personId)
            : null;
          setSelectedPersonId(params.personId ?? null);
          setPersonQuery(presetPerson?.name ?? '');
          setPersonLocked(!!params.personId);
          setDirection(params.direction ?? 'given');
          setRaw('');
          setOccurredAt(new Date());
          setNote('');
        }

        // Called directly from the triggering event handler, exactly like DateSelector/NoteChip —
        // see udhaarEntrySheetStore.ts for why this replaced a Zustand-state-driven effect.
        sheetRef.current?.present();
      },
    });
    return () => registerUdhaarEntrySheet(null);
  }, []);

  const suggestions = useUdhaarPeople(userId, personQuery);
  const exactMatch = suggestions.find(
    p => p.name.toLowerCase() === personQuery.trim().toLowerCase(),
  );
  const showSuggestions =
    !personLocked && personQuery.trim().length > 0 && !selectedPersonId;

  const selectedPerson = selectedPersonId
    ? udhaarRepo.getPerson(selectedPersonId)
    : null;
  const showExtendedDirections =
    !!selectedPerson &&
    (selectedPerson.balancePaise !== 0 ||
      direction === 'received' ||
      direction === 'paid');

  const amountPaise = useMemo(() => rawToPaise(raw), [raw]);

  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);
  const isToday = sameDay(occurredAt, today);
  const isYesterday = sameDay(occurredAt, yesterday);
  const pickedDateLabel = new Intl.DateTimeFormat(
    language === 'hi' ? 'hi-IN' : 'en-IN',
    { day: '2-digit', month: 'short' },
  ).format(occurredAt);

  const giveLike = direction === 'given' || direction === 'paid';

  const handlePickPerson = (id: string, name: string) => {
    setSelectedPersonId(id);
    setPersonQuery(name);
  };

  const handleSave = () => {
    const trimmedName = personQuery.trim();
    if (!selectedPersonId && !trimmedName) {
      setError(t('validation.nameRequired'));
      return;
    }
    if (amountPaise <= 0) {
      setError(t('validation.amountRequired'));
      return;
    }
    if (amountPaise > MAX_AMOUNT_PAISE) {
      setError(t('validation.amountTooLarge'));
      return;
    }
    setError(null);

    const personId =
      selectedPersonId ??
      udhaarRepo.findOrCreatePersonByName(userId, trimmedName).id;

    if (currentParams.current.editId) {
      udhaarRepo.updateEntry(currentParams.current.editId, {
        direction,
        amountPaise,
        occurredAt,
        note: note || null,
      });
    } else {
      udhaarRepo.addEntry({
        userId,
        personId,
        direction,
        amountPaise,
        occurredAt,
        note: note || null,
      });
    }

    sheetRef.current?.dismiss();
    showToast({ message: t('toast.udhaarSaved') });
  };

  return (
    <AppBottomSheet
      ref={sheetRef}
      title={t(editId ? 'common.edit' : 'udhaar.add')}
      onClose={() => {}}
      snapPoints={['85%']}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {editId ? (
          // Editing never changes an entry's direction — that's a property of how it was
          // recorded, not something to flip after the fact. Show it as a fixed label instead of
          // a choice.
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              minHeight: 54,
              borderRadius: radius.card,
              borderWidth: 1.5,
              borderColor: palette.border,
              paddingHorizontal: 14,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: giveLike
                  ? palette.expenseTint
                  : palette.incomeTint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {giveLike ? (
                <ArrowUpRight
                  size={16}
                  color={palette.expense}
                  strokeWidth={2}
                />
              ) : (
                <ArrowDownLeft
                  size={16}
                  color={palette.income}
                  strokeWidth={2}
                />
              )}
            </View>
            <AppText variant="rowTitle">{t(`udhaar.${direction}`)}</AppText>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <DirectionCard
                icon={ArrowUpRight}
                tint={palette.expenseTint}
                color={palette.expense}
                title={t('udhaar.iGave')}
                subtitle={t('udhaar.iGaveSub')}
                selected={direction === 'given'}
                onPress={() => setDirection('given')}
              />
              <DirectionCard
                icon={ArrowDownLeft}
                tint={palette.incomeTint}
                color={palette.income}
                title={t('udhaar.iTook')}
                subtitle={t('udhaar.iTookSub')}
                selected={direction === 'took'}
                onPress={() => setDirection('took')}
              />
            </View>

            {showExtendedDirections ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <DirectionCard
                  icon={ArrowDownLeft}
                  tint={palette.incomeTint}
                  color={palette.income}
                  title={t('udhaar.received')}
                  selected={direction === 'received'}
                  onPress={() => setDirection('received')}
                />
                <DirectionCard
                  icon={ArrowUpRight}
                  tint={palette.expenseTint}
                  color={palette.expense}
                  title={t('udhaar.paid')}
                  selected={direction === 'paid'}
                  onPress={() => setDirection('paid')}
                />
              </View>
            ) : null}
          </>
        )}

        <View style={{ gap: 6 }}>
          <AppText variant="label" color="secondary">
            {t('udhaar.person')}
          </AppText>
          {personLocked ? (
            <View
              style={{
                height: 48,
                borderRadius: radius.input,
                borderWidth: 1,
                borderColor: palette.border,
                justifyContent: 'center',
                paddingHorizontal: 14,
              }}
            >
              <AppText variant="rowTitle">{personQuery}</AppText>
            </View>
          ) : (
            <TextInput
              value={personQuery}
              onChangeText={text => {
                setPersonQuery(text);
                setSelectedPersonId(null);
              }}
              placeholder={t('udhaar.addOrSelectPerson')}
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
          )}
          {showSuggestions ? (
            <View
              style={{
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: palette.border,
                overflow: 'hidden',
              }}
            >
              {suggestions.slice(0, 5).map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => handlePickPerson(p.id, p.name)}
                  style={{
                    minHeight: 48,
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: palette.border,
                  }}
                >
                  <AppText variant="rowTitle">{p.name}</AppText>
                </Pressable>
              ))}
              {!exactMatch ? (
                <Pressable
                  onPress={() => {
                    const created = udhaarRepo.findOrCreatePersonByName(
                      userId,
                      personQuery.trim(),
                    );
                    handlePickPerson(created.id, created.name);
                  }}
                  style={{
                    minHeight: 48,
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Plus size={16} color={palette.primary} strokeWidth={2} />
                  <AppText variant="rowTitle" color="brand">
                    {t('udhaar.addNewPerson', { name: personQuery.trim() })}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={{ gap: 6 }}>
          <AppText variant="label" color="secondary">
            {t('udhaar.amount')}
          </AppText>
          <View
            style={{
              height: 48,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: radius.input,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <AppText
              variant="section"
              style={{
                color: giveLike ? palette.expense : palette.income,
                fontWeight: '800',
              }}
            >
              ₹
            </AppText>
            <TextInput
              value={raw}
              onChangeText={text =>
                setRaw(prev => sanitizeAmountText(prev, text))
              }
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={palette.textTertiary}
              style={{
                flex: 1,
                fontFamily: fontFamily[700],
                fontSize: typography.section.size,
                fontWeight: '800',
                color: giveLike ? palette.expense : palette.income,
                padding: 0,
              }}
              accessibilityLabel={t('add.amountLabelExpense')}
            />
          </View>
        </View>
        {error ? (
          <AppText
            variant="caption"
            color="error"
            style={{ textAlign: 'center' }}
          >
            {error}
          </AppText>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
          }}
        >
          <Chip
            label={t('common.today')}
            selected={isToday}
            onPress={() => setOccurredAt(withTimeOf(today, occurredAt))}
          />
          <Chip
            label={t('common.yesterday')}
            selected={isYesterday}
            onPress={() => setOccurredAt(withTimeOf(yesterday, occurredAt))}
          />
          <Chip
            label={
              isToday || isYesterday ? t('common.pickDate') : pickedDateLabel
            }
            icon={Calendar}
            selected={!isToday && !isYesterday}
            onPress={() => setShowNativePicker(true)}
          />
        </View>

        <TextInput
          value={note}
          onChangeText={text => setNote(text.slice(0, 120))}
          placeholder={`${t('common.note')} (${t('common.optional')})`}
          placeholderTextColor={palette.textTertiary}
          maxLength={120}
          style={{
            height: 48,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: radius.input,
            paddingHorizontal: 14,
            fontFamily: fontFamily[typography.body.weight],
            fontSize: typography.body.size,
            color: palette.textPrimary,
          }}
        />

        {showNativePicker ? (
          <DateTimePicker
            value={occurredAt}
            mode="date"
            maximumDate={today}
            display="default"
            onChange={(event, selected) => {
              setShowNativePicker(false);
              if (event.type === 'set' && selected)
                setOccurredAt(withTimeOf(selected, occurredAt));
            }}
          />
        ) : null}

        <Button label={t('udhaar.save')} onPress={handleSave} />
      </ScrollView>
    </AppBottomSheet>
  );
}
