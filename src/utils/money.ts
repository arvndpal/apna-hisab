/**
 * Money helpers. Store and add integer paise only; format only at the UI edge.
 * Unit-test every function here (see ARCHITECTURE §15).
 */

export const MAX_AMOUNT_PAISE = 10_000_000_00; // ₹1,00,00,000

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** 285000 → "2,850"; 12345 → "123.45" (no symbol, no sign). */
export function formatPaise(paise: number): string {
  return inr.format(Math.abs(paise) / 100);
}

export type AmountKind = 'income' | 'expense' | 'net' | 'neutral';

/** Adds ₹ and the sign required by the design system. Uses U+2212 minus. */
export function formatRupees(paise: number, kind: AmountKind = 'neutral', showSign = kind !== 'neutral'): string {
  const body = `₹${formatPaise(paise)}`;
  if (!showSign) return body;
  if (kind === 'income') return `+${body}`;
  if (kind === 'expense') return `\u2212${body}`;
  if (kind === 'net') return paise > 0 ? `+${body}` : paise < 0 ? `\u2212${body}` : body;
  return body;
}

/** Compact for charts/calendar: 2100 rupees → "2.1K", 1250000 → "12.5L", 15000000 → "1.5Cr". */
export function formatCompact(paise: number, withSign = false): string {
  const r = Math.abs(paise) / 100;
  const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');
  const s = r >= 1e7 ? `${fmt(r / 1e7)}Cr` : r >= 1e5 ? `${fmt(r / 1e5)}L` : r >= 1e3 ? `${fmt(r / 1e3)}K` : fmt(r);
  if (!withSign) return s;
  return paise > 0 ? `+${s}` : paise < 0 ? `\u2212${s}` : s;
}

/** Spoken label for TalkBack: "2,850 rupees, income". Pass the translated template from i18n (a11y.*). */
export function spokenAmount(paise: number): string {
  return formatPaise(paise);
}

/* ---------- Keypad input (string state → paise) ---------- */

/** Applies one keypad key to the raw input string (digits and at most one "."). Returns the new raw string. */
export function applyKey(raw: string, key: string): string {
  if (key === 'backspace') return raw.slice(0, -1);
  if (key === 'clear') return '';
  if (key === '.') {
    if (raw.includes('.')) return raw;
    return raw === '' ? '0.' : `${raw}.`;
  }
  if (!/^\d$/.test(key)) return raw;
  const [int, dec] = raw.split('.');
  if (dec !== undefined && dec.length >= 2) return raw; // max 2 decimals
  if (dec === undefined && int === '0') return key; // no leading zeros
  const next = raw + key;
  return rawToPaise(next) > MAX_AMOUNT_PAISE ? raw : next;
}

/** "1250.5" → 125050 */
export function rawToPaise(raw: string): number {
  if (!raw) return 0;
  const [int, dec = ''] = raw.split('.');
  return parseInt(int || '0', 10) * 100 + parseInt((dec + '00').slice(0, 2), 10);
}

/** Display while typing with Indian grouping, preserving a trailing "." or decimals: "125000.5" → "1,25,000.5" */
export function formatRawForDisplay(raw: string): string {
  if (!raw) return '0';
  const [int, dec] = raw.split('.');
  const grouped = new Intl.NumberFormat('en-IN').format(parseInt(int || '0', 10));
  return dec === undefined ? grouped : `${grouped}.${dec}`;
}

/** Inverse for edit mode: 125050 → "1250.5" */
export function paiseToRaw(paise: number): string {
  const r = Math.floor(paise / 100);
  const p = paise % 100;
  if (p === 0) return String(r);
  return `${r}.${String(p).padStart(2, '0').replace(/0$/, '')}`;
}
