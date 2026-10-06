/**
 * CSV export (SCREENS.md §19c) — free for everyone. Pure string building so it's unit-testable;
 * ExportScreen handles reading rows and the share sheet.
 */
import type { TFunction } from 'i18next';
import type { Category, Language, Transaction, UdhaarEntry } from '../../types/models';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';

/** Excel only reads a CSV as UTF-8 (Hindi names, ₹) when it starts with a byte-order mark. */
const BOM = '﻿';

export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) || /^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Array<Array<string | number | null>>): string {
  return BOM + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Plain decimal rupees ("1250.50") so spreadsheets can sum the column; integer maths only. */
export function paiseToPlainRupees(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** occurred_at keeps its local offset ("2026-10-03T09:05:00+05:30") — read the wall-clock time straight off it. */
function localTime(occurredAt: string): string {
  return occurredAt.slice(11, 16);
}

export function buildTransactionsCsv(
  transactions: Transaction[],
  categoriesById: Record<string, Category>,
  t: TFunction,
  language: Language,
): string {
  const header = [
    t('export.colDate'),
    t('export.colTime'),
    t('export.colType'),
    t('export.colCategory'),
    t('export.colAmount'),
    t('export.colPayment'),
    t('export.colNote'),
  ];
  const rows = [...transactions]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((txn) => {
      const category = categoriesById[txn.categoryId];
      return [
        txn.occurredOn,
        localTime(txn.occurredAt),
        t(`transactions.${txn.type}`),
        category ? categoryDisplayName(category, language) : '',
        paiseToPlainRupees(txn.type === 'expense' ? -txn.amountPaise : txn.amountPaise),
        t(`payment.${txn.paymentMethod}`),
        txn.note,
      ];
    });
  return toCsv([header, ...rows]);
}

export function buildUdhaarCsv(entries: Array<UdhaarEntry & { personName: string }>, t: TFunction): string {
  const header = [t('export.colDate'), t('export.colPerson'), t('export.colUdhaar'), t('export.colAmount'), t('export.colNote')];
  const rows = entries.map((e) => [e.occurredOn, e.personName, t(`udhaar.${e.direction}`), paiseToPlainRupees(e.amountPaise), e.note]);
  return toCsv([header, ...rows]);
}
