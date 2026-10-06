/**
 * The exported tables, format-independent: CSV, Excel and PDF all render these same rows.
 * Amounts stay integer paise here; each format decides how to print them.
 */
import type { TFunction } from 'i18next';
import type { Category, Language, Transaction, UdhaarEntry } from '../../types/models';
import { categoryDisplayName } from '../../database/repositories/categoriesRepo';

export type Cell = { text: string } | { paise: number };

export interface Table {
  title: string;
  header: string[];
  rows: Cell[][];
}

const text = (value: string | null | undefined): Cell => ({ text: value ?? '' });

/** occurred_at keeps its local offset ("2026-10-03T09:05:00+05:30") — read the wall-clock time straight off it. */
function localTime(occurredAt: string): string {
  return occurredAt.slice(11, 16);
}

/** Oldest first; expenses negative so a column sum is the net. */
export function transactionsTable(
  transactions: Transaction[],
  categoriesById: Record<string, Category>,
  t: TFunction,
  language: Language,
): Table {
  const rows = [...transactions]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((txn) => {
      const category = categoriesById[txn.categoryId];
      return [
        text(txn.occurredOn),
        text(localTime(txn.occurredAt)),
        text(t(`transactions.${txn.type}`)),
        text(category ? categoryDisplayName(category, language) : ''),
        { paise: txn.type === 'expense' ? -txn.amountPaise : txn.amountPaise },
        text(t(`payment.${txn.paymentMethod}`)),
        text(txn.note),
      ];
    });
  return {
    title: t('export.sheetTransactions'),
    header: [
      t('export.colDate'),
      t('export.colTime'),
      t('export.colType'),
      t('export.colCategory'),
      t('export.colAmount'),
      t('export.colPayment'),
      t('export.colNote'),
    ],
    rows,
  };
}

export function udhaarTable(entries: Array<UdhaarEntry & { personName: string }>, t: TFunction): Table {
  return {
    title: t('export.sheetUdhaar'),
    header: [t('export.colDate'), t('export.colPerson'), t('export.colUdhaar'), t('export.colAmount'), t('export.colNote')],
    rows: entries.map((e) => [text(e.occurredOn), text(e.personName), text(t(`udhaar.${e.direction}`)), { paise: e.amountPaise }, text(e.note)]),
  };
}

/** Plain decimal rupees ("1250.50") so spreadsheets can sum the column; integer maths only. */
export function paiseToPlainRupees(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function cellText(cell: Cell): string {
  return 'paise' in cell ? paiseToPlainRupees(cell.paise) : cell.text;
}

/** Income/expense totals for the statement header. Net = income − expense; Udhaar never counts. */
export function totals(transactions: Transaction[]): { incomePaise: number; expensePaise: number; netPaise: number } {
  let incomePaise = 0;
  let expensePaise = 0;
  for (const txn of transactions) {
    if (txn.type === 'income') incomePaise += txn.amountPaise;
    else expensePaise += txn.amountPaise;
  }
  return { incomePaise, expensePaise, netPaise: incomePaise - expensePaise };
}
