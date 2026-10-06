/**
 * PDF export (Premium): an HTML statement that react-native-html-to-pdf prints through Android's
 * WebView, so Hindi renders with the system's Devanagari font. Pure — unit-tested.
 */
import { formatRupees } from '../../utils/money';
import type { Table } from './rows';

export function htmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface StatementInput {
  title: string;
  rangeLabel: string;
  generatedLabel: string;
  totals: Array<{ label: string; paise: number; kind: 'income' | 'expense' | 'net' }>;
  tables: Table[];
}

/** Signed transaction amounts print with +/− and ₹ (never colour alone); Udhaar amounts are plain. */
function amountHtml(paise: number, signed: boolean): string {
  if (!signed) return htmlEscape(formatRupees(paise));
  const kind = paise < 0 ? 'expense' : 'income';
  return `<span class="${kind}">${htmlEscape(formatRupees(Math.abs(paise), kind))}</span>`;
}

function tableHtml(table: Table, signedAmounts: boolean): string {
  const head = table.header.map((h) => `<th>${htmlEscape(h)}</th>`).join('');
  const body = table.rows
    .map((row) => `<tr>${row.map((c) => ('paise' in c ? `<td class="num">${amountHtml(c.paise, signedAmounts)}</td>` : `<td>${htmlEscape(c.text)}</td>`)).join('')}</tr>`)
    .join('');
  return `<h2>${htmlEscape(table.title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildStatementHtml(input: StatementInput): string {
  const totals = input.totals
    .map((tot) => `<div class="total"><div class="label">${htmlEscape(tot.label)}</div><div class="value ${tot.kind}">${htmlEscape(formatRupees(tot.paise, tot.kind))}</div></div>`)
    .join('');
  // First table holds transactions (signed amounts); the rest (Udhaar) are unsigned.
  const tables = input.tables.filter((t) => t.rows.length > 0).map((t) => tableHtml(t, t === input.tables[0])).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { font-family: 'Noto Sans', 'Noto Sans Devanagari', sans-serif; color: #15201C; font-size: 11px; margin: 24px; }
    header { border-bottom: 3px solid #0A7A5E; padding-bottom: 10px; margin-bottom: 14px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #0A7A5E; }
    .muted { color: #58645F; }
    .totals { display: flex; gap: 10px; margin-bottom: 18px; }
    .total { flex: 1; border: 1px solid #E6EAE7; border-radius: 8px; padding: 8px 10px; }
    .total .label { color: #58645F; font-size: 10px; }
    .total .value { font-size: 15px; font-weight: 700; }
    h2 { font-size: 13px; margin: 16px 0 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; background: #F0F2F0; font-weight: 700; }
    th, td { padding: 5px 6px; border-bottom: 1px solid #E6EAE7; vertical-align: top; }
    td.num { text-align: right; white-space: nowrap; }
    tr { page-break-inside: avoid; }
    .income { color: #137A43; } .expense { color: #C2410C; } .net { color: #15201C; }
  </style></head><body>
    <header><h1>${htmlEscape(input.title)}</h1><div class="muted">${htmlEscape(input.rangeLabel)} · ${htmlEscape(input.generatedLabel)}</div></header>
    <div class="totals">${totals}</div>
    ${tables}
  </body></html>`;
}
