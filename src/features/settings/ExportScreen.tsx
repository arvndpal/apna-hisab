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
import { tableToCsv } from '../../services/export/csv';
import { totals, transactionsTable, udhaarTable, type Table } from '../../services/export/rows';
import { buildXlsx } from '../../services/export/xlsx';
import { buildStatementHtml } from '../../services/export/pdfHtml';
import { saveToDownloads, writeCacheFile } from '../../services/export/saveToDownloads';
import { generatePDF } from 'react-native-html-to-pdf';
import type { Transaction } from '../../types/models';
import { bytesToBase64, utf8ToBase64 } from '../../utils/base64';
import { useEntitlement } from '../subscription/useEntitlement';
import { exportFileStem, getExportRange, type ExportRangeKind } from './exportRanges';
import type { AppStackParamList } from '../../app/navigation/types';
import { suppressNextResumeLock } from '../../app/navigation/resumeLock';

type Format = 'csv' | 'pdf' | 'excel';
const RANGE_KINDS: ExportRangeKind[] = ['thisMonth', 'lastMonth', 'thisYear', 'custom'];
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** "2026-10-05" → local midnight Date. */
function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** SCREENS.md §19c. CSV is free; PDF and Excel are Premium — free users are sent to Premium. */
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
    if (format !== 'csv' && !isPremium) {
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
      const tables = { transactions: transactionsTable(transactions, categoriesById, t, language), udhaar: udhaarTable(udhaar, t) };
      if (format === 'csv') {
        suppressNextResumeLock();
        const result = await Share.open({ ...buildCsvShareFiles(tables), title: t('export.title'), failOnCancel: false });
        if (result.success) showToast({ message: t('toast.exportReady') });
      } else {
        await exportToDownloads(format, tables, transactions);
        showToast({ message: t('toast.savedToDownloads') });
      }
    } catch {
      setNotice('failed');
    } finally {
      setBusy(false);
    }
  };

  /** One CSV file per non-empty table, handed to the share sheet (CSV is free, no Premium gate to work around). */
  const buildCsvShareFiles = (tables: { transactions: Table; udhaar: Table }): { urls: string[]; filenames: string[]; type: string } => {
    const present = (['transactions', 'udhaar'] as const).filter((k) => tables[k].rows.length > 0);
    return {
      urls: present.map((k) => `data:text/csv;base64,${utf8ToBase64(tableToCsv(tables[k]))}`),
      filenames: present.map((k) => exportFileStem(k, range)),
      type: 'text/csv',
    };
  };

  /** Excel: one workbook, a sheet each. PDF: one printed statement. Both saved as real files via MediaStore. */
  const exportToDownloads = async (fmt: 'pdf' | 'excel', tables: { transactions: Table; udhaar: Table }, transactions: Transaction[]): Promise<void> => {
    const present = (['transactions', 'udhaar'] as const).filter((k) => tables[k].rows.length > 0);
    const stem = exportFileStem('statement', range);
    if (fmt === 'excel') {
      const xlsx = buildXlsx(present.map((k) => tables[k]));
      // MediaStore needs an existing local file to copy from, not raw bytes — write it to the app's
      // private cache first, then copy that into the Downloads collection.
      const cachePath = await writeCacheFile(`${stem}.xlsx`, bytesToBase64(xlsx));
      await saveToDownloads(cachePath, `${stem}.xlsx`, XLSX_MIME);
      return;
    }
    const sums = totals(transactions);
    const html = buildStatementHtml({
      title: t('export.statementTitle'),
      rangeLabel: `${dateLabel(parseDay(range.from))} – ${dateLabel(parseDay(range.to))}`,
      generatedLabel: t('export.generatedOn', { date: dateLabel(new Date()) }),
      totals: [
        { label: t('export.totalIncome'), paise: sums.incomePaise, kind: 'income' },
        { label: t('export.totalExpense'), paise: sums.expensePaise, kind: 'expense' },
        { label: t('export.net'), paise: sums.netPaise, kind: 'net' },
      ],
      tables: [tables.transactions, tables.udhaar],
    });
    // A4 portrait in points. `directory` persists the file under getExternalFilesDir (not the app's
    // private cache dir) while generatePDF still needs somewhere of its own to render to first.
    const pdf = await generatePDF({ html, fileName: stem, width: 595, height: 842, directory: 'Documents' });
    await saveToDownloads(pdf.filePath, `${stem}.pdf`, 'application/pdf');
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
