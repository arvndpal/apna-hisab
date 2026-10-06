import { toOccurredOn } from '../../utils/dates';

export type ExportRangeKind = 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export interface ExportRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

/** The four presets on the Export screen (SCREENS.md §19c). "custom" passes the user's picks through, ordered. */
export function getExportRange(kind: ExportRangeKind, today: Date, custom?: { from: Date; to: Date }): ExportRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (kind) {
    case 'thisMonth':
      return { from: toOccurredOn(new Date(y, m, 1)), to: toOccurredOn(new Date(y, m + 1, 0)) };
    case 'lastMonth':
      return { from: toOccurredOn(new Date(y, m - 1, 1)), to: toOccurredOn(new Date(y, m, 0)) };
    case 'thisYear':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'custom': {
      const a = custom?.from ?? today;
      const b = custom?.to ?? today;
      const [start, end] = a <= b ? [a, b] : [b, a];
      return { from: toOccurredOn(start), to: toOccurredOn(end) };
    }
  }
}

/** File name stem, e.g. "apna-hisab-transactions_2026-10-01_2026-10-31". */
export function exportFileStem(kind: 'transactions' | 'udhaar' | 'statement', range: ExportRange): string {
  return `apna-hisab-${kind}_${range.from}_${range.to}`;
}
