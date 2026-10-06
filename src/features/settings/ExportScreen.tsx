import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import Share from 'react-native-share';
import { Calendar, Download } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Banner } from '../../components/common/Banner';
import { Button } from '../../components/common/Button';
import { Chip, ChipRow } from '../../components/common/Chip';
import { Option } from '../../components/common/Option';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useSettingsStore } from '../../store/settingsStore';
import { showToast } from '../../store/toastStore';
import * as transactionsRepo from '../../database/repositories/transactionsRepo';
import * as categoriesRepo from '../../database/repositories/categoriesRepo';
import * as udhaarRepo from '../../database/repositories/udhaarRepo';
import { buildTransactionsCsv, buildUdhaarCsv } from '../../services/export/csv';
import { utf8ToBase64 } from '../../utils/base64';
import { useEntitlement } from '../subscription/useEntitlement';
import { exportFileStem, getExportRange, type ExportRangeKind } from './exportRanges';
import type { AppStackParamList } from '../../app/navigation/types';

type Format = 'csv' | 'pdf' | 'excel';
const RANGE_KINDS: ExportRangeKind[] = ['thisMonth', 'lastMonth', 'thisYear', 'custom'];

/** SCREENS.md §19c. CSV is free; PDF/Excel are Premium (built in Milestone 9) and route to Premium for now. */
export function ExportScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const userId = useActiveUserId();
  const language = useSettingsStore((s) => s.language);
  const { isPremium } = useEntitlement();

  const [kind, setKind] = useState<ExportRangeKind>('thisMonth');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [customTo, setCustomTo] = useState(() => new Date());
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [format, setFormat] = useState<Format>('csv');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<'noData' | 'failed' | null>(null);

  const range = useMemo(() => getExportRange(kind, new Date(), { from: customFrom, to: customTo }), [kind, customFrom, customTo]);
  const dateLabel = (d: Date) =>
    new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric', numberingSystem: 'latn' }).format(d);

  const chooseFormat = (next: Format) => {
    if (next !== 'csv' && !isPremium) {
      navigation.navigate('Premium');
      return;
    }
    setFormat(next);
  };

  const handleExport = async () => {
    if (format !== 'csv') {
      navigation.navigate('Premium');
      return;
    }
    setNotice(null);
    setBusy(true);
    try {
      const transactions = transactionsRepo.list({ userId, from: range.from, to: range.to });
      const udhaar = udhaarRepo.listEntriesInRange(userId, range.from, range.to);
      if (transactions.length === 0 && udhaar.length === 0) {
        setNotice('noData');
        return;
      }
      const categoriesById = Object.fromEntries(categoriesRepo.list(userId).map((c) => [c.id, c]));
      const urls: string[] = [];
      const filenames: string[] = [];
      if (transactions.length > 0) {
        urls.push(`data:text/csv;base64,${utf8ToBase64(buildTransactionsCsv(transactions, categoriesById, t, language))}`);
        filenames.push(exportFileStem('transactions', range));
      }
      if (udhaar.length > 0) {
        urls.push(`data:text/csv;base64,${utf8ToBase64(buildUdhaarCsv(udhaar, t))}`);
        filenames.push(exportFileStem('udhaar', range));
      }
      const result = await Share.open({ urls, filenames, type: 'text/csv', title: t('export.title'), failOnCancel: false });
      if (result.success) showToast({ message: t('toast.exportReady') });
    } catch {
      setNotice('failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title={t('export.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 12 }}>
        <AppText variant="group" color="secondary" accessibilityRole="header">
          {t('export.range')}
        </AppText>
        <ChipRow>
          {RANGE_KINDS.map((k) => (
            <Chip key={k} label={t(`export.${k}`)} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </ChipRow>
        {kind === 'custom' ? (
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Chip icon={Calendar} label={`${t('export.from')}: ${dateLabel(customFrom)}`} onPress={() => setPicking('from')} />
            <Chip icon={Calendar} label={`${t('export.to')}: ${dateLabel(customTo)}`} onPress={() => setPicking('to')} />
          </View>
        ) : null}
        <AppText variant="secondary" color="secondary">
          {t('export.includes')}
        </AppText>

        <AppText variant="group" color="secondary" style={{ marginTop: 12 }} accessibilityRole="header">
          {t('export.format')}
        </AppText>
        <View style={{ gap: 10 }} accessibilityRole="radiogroup">
          <Option title={t('export.csv')} subtitle={t('export.csvSub')} selected={format === 'csv'} onPress={() => chooseFormat('csv')} />
          <Option
            title={t('export.pdf')}
            subtitle={t('export.pdfSub')}
            badge={isPremium ? undefined : t('export.premiumBadge')}
            selected={format === 'pdf'}
            onPress={() => chooseFormat('pdf')}
          />
          <Option
            title={t('export.excel')}
            subtitle={t('export.excelSub')}
            badge={isPremium ? undefined : t('export.premiumBadge')}
            selected={format === 'excel'}
            onPress={() => chooseFormat('excel')}
          />
        </View>

        {notice ? (
          <Banner
            variant={notice === 'failed' ? 'warning' : 'neutral'}
            title={notice === 'failed' ? t('export.failed') : t('export.noData')}
            onDismiss={() => setNotice(null)}
          />
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <Button label={t('export.export')} icon={Download} onPress={handleExport} loading={busy} />
      </View>

      {picking ? (
        <DateTimePicker
          value={picking === 'from' ? customFrom : customTo}
          mode="date"
          maximumDate={new Date()}
          display="default"
          onChange={(event, selected) => {
            const which = picking;
            setPicking(null);
            if (event.type === 'set' && selected) (which === 'from' ? setCustomFrom : setCustomTo)(selected);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
