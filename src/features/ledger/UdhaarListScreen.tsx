import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ArrowDownLeft, ArrowUpRight, Info, Users } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Amount } from '../../components/common/Amount';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useUdhaarPeople } from '../../hooks/useUdhaarPeople';
import { useUdhaarTotals } from '../../hooks/useUdhaarTotals';
import { useDebounce } from '../../hooks/useDebounce';
import { useSettingsStore } from '../../store/settingsStore';
import { openUdhaarEntrySheet } from '../../store/udhaarEntrySheetStore';
import type { AppStackParamList } from '../../app/navigation/types';
import type { UdhaarPersonWithBalance } from '../../types/models';

function PersonRow({ person, onPress, showDivider }: { person: UdhaarPersonWithBalance; onPress: () => void; showDivider: boolean }) {
  const { t } = useTranslation();
  const palette = useTheme();
  const language = useSettingsStore((s) => s.language);
  const settled = person.balancePaise === 0;

  const subtitle = person.lastEntry
    ? `${t(`udhaar.${person.lastEntry.direction}`)} ${new Intl.NumberFormat('en-IN').format(person.lastEntry.amountPaise / 100)} · ${new Intl.DateTimeFormat(
        language === 'hi' ? 'hi-IN' : 'en-IN',
        { day: '2-digit', month: 'short' },
      ).format(new Date(`${person.lastEntry.occurredOn}T00:00:00`))}`
    : t('udhaar.noActivity');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ minHeight: 64, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: showDivider ? 1 : 0, borderBottomColor: palette.border }}
    >
      <Avatar name={person.name} settled={settled} />
      <View style={{ flex: 1 }}>
        <AppText variant="rowTitle" numberOfLines={1}>
          {person.name}
        </AppText>
        <AppText variant="secondary" color="secondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <AppText variant="caption" color="secondary">
          {t(settled ? 'udhaar.settled' : person.balancePaise > 0 ? 'udhaar.receive' : 'udhaar.pay')}
        </AppText>
        {settled ? null : <Amount paise={Math.abs(person.balancePaise)} kind={person.balancePaise > 0 ? 'income' : 'expense'} size="row" showSign={false} />}
      </View>
    </Pressable>
  );
}

export function UdhaarListScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const userId = useActiveUserId();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  const allPeople = useUdhaarPeople(userId);
  const totals = useUdhaarTotals(userId);
  const receiveCount = useMemo(() => allPeople.filter((p) => p.balancePaise > 0).length, [allPeople]);
  const payCount = useMemo(() => allPeople.filter((p) => p.balancePaise < 0).length, [allPeople]);

  const filteredPeople = useUdhaarPeople(userId, debouncedSearch || undefined);
  const sortedPeople = useMemo(() => [...filteredPeople].sort((a, b) => (a.balancePaise === 0 ? 1 : 0) - (b.balancePaise === 0 ? 1 : 0)), [filteredPeople]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
        <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} />
        <AppText variant="titlePushed">{t('udhaar.title')}</AppText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: palette.incomeTint, padding: 14, gap: 6 }}>
            <ArrowDownLeft size={18} color={palette.income} strokeWidth={2.5} />
            <AppText variant="label" color="secondary">
              {t('udhaar.willReceive')}
            </AppText>
            <Amount paise={totals.receivePaise} kind="income" size="L" showSign={false} />
            <AppText variant="caption" color="secondary">
              {t('udhaar.fromPeople', { count: receiveCount })}
            </AppText>
          </View>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: palette.expenseTint, padding: 14, gap: 6 }}>
            <ArrowUpRight size={18} color={palette.expense} strokeWidth={2.5} />
            <AppText variant="label" color="secondary">
              {t('udhaar.needToPay')}
            </AppText>
            <Amount paise={totals.payPaise} kind="expense" size="L" showSign={false} />
            <AppText variant="caption" color="secondary">
              {t('udhaar.toPeople', { count: payCount })}
            </AppText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Info size={14} color={palette.textTertiary} strokeWidth={2} />
          <AppText variant="caption" color="secondary">
            {t('udhaar.separateNote')}
          </AppText>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder={t('udhaar.searchPeople')} />

        {sortedPeople.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? t('empty.search.title') : t('empty.udhaar.title')}
            body={search ? t('empty.search.body', { query: search }) : t('empty.udhaar.body')}
            actions={
              search
                ? [{ label: t('empty.search.clear'), variant: 'secondary', onPress: () => setSearch('') }]
                : [{ label: t('empty.udhaar.add'), variant: 'primary', onPress: () => openUdhaarEntrySheet() }]
            }
          />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: 14 }}>
            {sortedPeople.map((person, i) => (
              <PersonRow
                key={person.id}
                person={person}
                showDivider={i < sortedPeople.length - 1}
                onPress={() => navigation.navigate('UdhaarPerson', { personId: person.id })}
              />
            ))}
          </Card>
        )}
      </ScrollView>

      {sortedPeople.length > 0 ? (
        <View style={{ padding: 16, paddingBottom: 18, backgroundColor: palette.background }}>
          <Button label={t('udhaar.add')} onPress={() => openUdhaarEntrySheet()} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
