/**
 * Reports chart PDFs: one page per chart — the chart redrawn as inline SVG (the WebView that
 * react-native-html-to-pdf prints with renders it natively), its legend, and the numbers behind it.
 * Pure string building, unit-tested.
 */
import { formatCompact, formatRupees } from '../../utils/money';
import { htmlEscape } from './pdfHtml';

export const PDF_CHART_WIDTH = 547; // A4 width (595pt) minus 24px margins
const CHART_HEIGHT = 220;
const AXIS_LEFT = 44;
const AXIS_BOTTOM = 28;
const MAX_X_LABELS = 12;
/** Beyond this many days the bar chart groups by month — a year of daily bars would be sub-pixel. */
export const MAX_DAILY_BARS = 62;

export function pdfPage(input: { title: string; rangeLabel: string; generatedLabel: string; body: string }): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: 'Noto Sans', 'Noto Sans Devanagari', sans-serif; color: #15201C; font-size: 12px; margin: 24px; }
    header { border-bottom: 3px solid #0A7A5E; padding-bottom: 10px; margin-bottom: 18px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #0A7A5E; }
    .muted { color: #58645F; }
    .chart { text-align: center; margin: 8px 0 14px; }
    .legend { display: flex; gap: 18px; justify-content: center; margin-bottom: 14px; }
    .totals { display: flex; gap: 10px; margin-bottom: 16px; }
    .totals div { flex: 1; border: 1px solid #E6EAE7; border-radius: 8px; padding: 8px 10px; }
    .totals strong { display: block; font-size: 15px; }
    .total { font-size: 14px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; background: #F0F2F0; font-weight: 700; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #E6EAE7; }
    th.num, td.num { text-align: right; white-space: nowrap; }
    .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 5px; margin-right: 8px; vertical-align: middle; }
    tr { page-break-inside: avoid; }
  </style></head><body>
    <header><h1>${htmlEscape(input.title)}</h1><div class="muted">${htmlEscape(input.rangeLabel)} · ${htmlEscape(input.generatedLabel)}</div></header>
    ${input.body}
  </body></html>`;
}

export interface SeriesPoint {
  label: string;
  /** YYYY-MM-DD, used to group long ranges by month for the bar chart. */
  day?: string;
  incomePaise: number;
  expensePaise: number;
}

export interface SeriesColors {
  income: string;
  expense: string;
}

/** Axis maximum whose quarter is a round step (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ), so gridlines read cleanly. */
export function niceMax(maxPaise: number): number {
  if (maxPaise <= 0) return 400;
  const rawStep = maxPaise / 4;
  const exp = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * exp >= rawStep) ?? 10;
  return step * exp * 4;
}

/** Groups daily points into calendar months (label from `monthLabel`) once a range is too long to draw per day. */
export function groupByMonth(points: SeriesPoint[], monthLabel: (yyyyMm: string) => string): SeriesPoint[] {
  if (points.length <= MAX_DAILY_BARS || points.some((p) => !p.day)) return points;
  const months = new Map<string, SeriesPoint>();
  for (const p of points) {
    const key = p.day!.slice(0, 7);
    const m = months.get(key) ?? { label: monthLabel(key), day: `${key}-01`, incomePaise: 0, expensePaise: 0 };
    m.incomePaise += p.incomePaise;
    m.expensePaise += p.expensePaise;
    months.set(key, m);
  }
  return [...months.values()];
}

function axis(maxPaise: number, plotWidth: number): string {
  const lines: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const y = CHART_HEIGHT - AXIS_BOTTOM - ((CHART_HEIGHT - AXIS_BOTTOM - 10) * i) / 4;
    lines.push(
      `<line x1="${AXIS_LEFT}" y1="${y.toFixed(1)}" x2="${AXIS_LEFT + plotWidth}" y2="${y.toFixed(1)}" stroke="#E6EAE7" stroke-width="1"/>` +
        `<text x="${AXIS_LEFT - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#58645F">${htmlEscape(formatCompact((maxPaise * i) / 4))}</text>`,
    );
  }
  return lines.join('');
}

function xLabels(points: SeriesPoint[], xFor: (i: number) => number): string {
  const every = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
  return points
    .map((p, i) =>
      i % every === 0
        ? `<text x="${xFor(i).toFixed(1)}" y="${CHART_HEIGHT - 10}" text-anchor="${xFor(i) > PDF_CHART_WIDTH - 24 ? 'end' : 'middle'}" font-size="10" fill="#58645F">${htmlEscape(p.label)}</text>`
        : '',
    )
    .join('');
}

const yFor = (paise: number, max: number) => CHART_HEIGHT - AXIS_BOTTOM - ((CHART_HEIGHT - AXIS_BOTTOM - 10) * paise) / max;

/** Grouped bars: income and expense side by side per point. */
export function barsSvg(points: SeriesPoint[], colors: SeriesColors): string {
  const plotWidth = PDF_CHART_WIDTH - AXIS_LEFT - 4;
  const max = niceMax(Math.max(0, ...points.map((p) => Math.max(p.incomePaise, p.expensePaise))));
  const group = plotWidth / Math.max(points.length, 1);
  const bar = Math.max(1, Math.min(18, group * 0.36));
  const base = yFor(0, max);
  const xCenter = (i: number) => AXIS_LEFT + group * i + group / 2;
  const rect = (x: number, paise: number, color: string) =>
    paise > 0 ? `<rect x="${x.toFixed(1)}" y="${yFor(paise, max).toFixed(1)}" width="${bar.toFixed(1)}" height="${(base - yFor(paise, max)).toFixed(1)}" fill="${color}" rx="2"/>` : '';
  const bars = points.map((p, i) => rect(xCenter(i) - bar, p.incomePaise, colors.income) + rect(xCenter(i), p.expensePaise, colors.expense)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PDF_CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="0 0 ${PDF_CHART_WIDTH} ${CHART_HEIGHT}">${axis(max, plotWidth)}${bars}${xLabels(points, xCenter)}</svg>`;
}

/** Two lines (income, expense) across every point of the period. */
export function trendSvg(points: SeriesPoint[], colors: SeriesColors): string {
  const plotWidth = PDF_CHART_WIDTH - AXIS_LEFT - 12;
  const max = niceMax(Math.max(0, ...points.map((p) => Math.max(p.incomePaise, p.expensePaise))));
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const xFor = (i: number) => AXIS_LEFT + 6 + (points.length > 1 ? step * i : plotWidth / 2);
  const line = (key: 'incomePaise' | 'expensePaise', color: string) => {
    const coords = points.map((p, i) => `${xFor(i).toFixed(1)},${yFor(p[key], max).toFixed(1)}`);
    const dots = points.length <= 31 ? coords.map((c) => `<circle cx="${c.split(',')[0]}" cy="${c.split(',')[1]}" r="2.5" fill="${color}"/>`).join('') : '';
    return `<polyline points="${coords.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>${dots}`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PDF_CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="0 0 ${PDF_CHART_WIDTH} ${CHART_HEIGHT}">${axis(max, plotWidth)}${line('incomePaise', colors.income)}${line('expensePaise', colors.expense)}${xLabels(points, xFor)}</svg>`;
}

export interface IncomeExpensePdfInput {
  kind: 'bars' | 'trend';
  title: string;
  rangeLabel: string;
  generatedLabel: string;
  labels: { income: string; expense: string; net: string; date: string };
  colors: SeriesColors;
  points: SeriesPoint[];
  monthLabel: (yyyyMm: string) => string;
}

/** A table cell amount: "—" for nothing, rather than a signed zero. */
function cellAmount(paise: number, kind: 'income' | 'expense' | 'net'): string {
  return paise === 0 ? '—' : formatRupees(paise, kind);
}

/**
 * Chart, legend, period totals and a row per point that had any money (empty days add nothing).
 * The bar chart's table follows the chart, so a long range grouped by month is tabled by month too.
 */
export function buildIncomeExpenseHtml(input: IncomeExpensePdfInput): string {
  const chartPoints = input.kind === 'bars' ? groupByMonth(input.points, input.monthLabel) : input.points;
  const svg = input.kind === 'bars' ? barsSvg(chartPoints, input.colors) : trendSvg(chartPoints, input.colors);
  const income = input.points.reduce((s, p) => s + p.incomePaise, 0);
  const expense = input.points.reduce((s, p) => s + p.expensePaise, 0);
  const legend = `<div class="legend"><span><span class="swatch" style="background:${input.colors.income}"></span>${htmlEscape(input.labels.income)}</span><span><span class="swatch" style="background:${input.colors.expense}"></span>${htmlEscape(input.labels.expense)}</span></div>`;
  const totals =
    `<div class="totals"><div><span class="muted">${htmlEscape(input.labels.income)}</span><strong>${htmlEscape(formatRupees(income, 'income'))}</strong></div>` +
    `<div><span class="muted">${htmlEscape(input.labels.expense)}</span><strong>${htmlEscape(formatRupees(expense, 'expense'))}</strong></div>` +
    `<div><span class="muted">${htmlEscape(input.labels.net)}</span><strong>${htmlEscape(formatRupees(income - expense, 'net'))}</strong></div></div>`;
  const rows = (input.kind === 'bars' ? chartPoints : input.points)
    .filter((p) => p.incomePaise > 0 || p.expensePaise > 0)
    .map(
      (p) =>
        `<tr><td>${htmlEscape(p.label)}</td><td class="num">${htmlEscape(cellAmount(p.incomePaise, 'income'))}</td>` +
        `<td class="num">${htmlEscape(cellAmount(p.expensePaise, 'expense'))}</td><td class="num">${htmlEscape(cellAmount(p.incomePaise - p.expensePaise, 'net'))}</td></tr>`,
    )
    .join('');
  const table =
    `<table><thead><tr><th>${htmlEscape(input.labels.date)}</th><th class="num">${htmlEscape(input.labels.income)}</th>` +
    `<th class="num">${htmlEscape(input.labels.expense)}</th><th class="num">${htmlEscape(input.labels.net)}</th></tr></thead><tbody>${rows}</tbody></table>`;
  return pdfPage({ title: input.title, rangeLabel: input.rangeLabel, generatedLabel: input.generatedLabel, body: `<div class="chart">${svg}</div>${legend}${totals}${table}` });
}
