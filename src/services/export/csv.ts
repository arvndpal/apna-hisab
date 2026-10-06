/** CSV export (SCREENS.md §19c) — free for everyone. */
import { cellText, type Table } from './rows';

export { paiseToPlainRupees } from './rows';

/** Excel only reads a CSV as UTF-8 (Hindi names, ₹) when it starts with a byte-order mark. */
const BOM = '﻿';

export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) || /^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function tableToCsv(table: Table): string {
  const lines = [table.header.map(csvCell).join(','), ...table.rows.map((row) => row.map((c) => csvCell(cellText(c))).join(','))];
  return BOM + lines.join('\r\n') + '\r\n';
}
