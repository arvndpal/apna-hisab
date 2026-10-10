/**
 * "Where did you spend?" PDF (Reports): the expense donut drawn as inline SVG plus a full legend —
 * every category, not just the top five the card shows. Printed by react-native-html-to-pdf. Pure.
 */
import { formatRupees } from '../../utils/money';
import { htmlEscape } from './pdfHtml';
import { pdfPage } from './chartPdf';

export interface SpendingSlice {
  label: string;
  amountPaise: number;
  /** 0–1 share of the total. */
  share: number;
  color: string;
}

export interface SpendingPdfInput {
  title: string;
  rangeLabel: string;
  generatedLabel: string;
  totalLabel: string;
  columns: { category: string; amount: string; share: string };
  slices: SpendingSlice[];
}

/**
 * Slice colours: the first five match the app's donut (tokens.chartColors) exactly; beyond that the
 * palette repeats as lighter tints, so neighbouring slices never share a colour — the PDF lists every
 * category, not just the top five the card shows.
 */
export function sliceColor(index: number, palette: readonly string[]): string {
  const base = palette[index % palette.length];
  const round = Math.floor(index / palette.length);
  if (round === 0) return base;
  const mix = Math.min(0.3 * round, 0.75); // toward white
  const channel = (i: number) => Math.round(parseInt(base.slice(i, i + 2), 16) * (1 - mix) + 255 * mix);
  return `#${[1, 3, 5].map((i) => channel(i).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

const RADIUS = 70;
const STROKE = 34;
const SIZE = (RADIUS + STROKE / 2) * 2;

/** Donut as stacked dashed circles: each slice is an arc of length share × circumference. */
export function donutSvg(slices: SpendingSlice[], centerLabel: string, centerValue: string): string {
  const circumference = 2 * Math.PI * RADIUS;
  const c = SIZE / 2;
  let offset = 0;
  const arcs = slices
    .filter((s) => s.share > 0)
    .map((s) => {
      const length = s.share * circumference;
      const arc = `<circle cx="${c}" cy="${c}" r="${RADIUS}" fill="none" stroke="${s.color}" stroke-width="${STROKE}" stroke-dasharray="${length.toFixed(3)} ${(circumference - length).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}" transform="rotate(-90 ${c} ${c})"/>`;
      offset += length;
      return arc;
    })
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${arcs}` +
    `<text x="${c}" y="${c - 6}" text-anchor="middle" font-size="11" fill="#58645F">${htmlEscape(centerLabel)}</text>` +
    `<text x="${c}" y="${c + 14}" text-anchor="middle" font-size="16" font-weight="700" fill="#15201C">${htmlEscape(centerValue)}</text>` +
    '</svg>'
  );
}

export function buildSpendingHtml(input: SpendingPdfInput): string {
  const total = input.slices.reduce((sum, s) => sum + s.amountPaise, 0);
  const totalText = formatRupees(total);
  const rows = input.slices
    .map(
      (s) =>
        `<tr><td><span class="swatch" style="background:${s.color}"></span>${htmlEscape(s.label)}</td>` +
        `<td class="num">${htmlEscape(formatRupees(s.amountPaise))}</td><td class="num">${Math.round(s.share * 100)}%</td></tr>`,
    )
    .join('');
  const table =
    `<table><thead><tr><th>${htmlEscape(input.columns.category)}</th><th class="num">${htmlEscape(input.columns.amount)}</th><th class="num">${htmlEscape(input.columns.share)}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>`;
  return pdfPage({
    title: input.title,
    rangeLabel: input.rangeLabel,
    generatedLabel: input.generatedLabel,
    body:
      `<div class="chart">${donutSvg(input.slices, input.totalLabel, totalText)}</div>` +
      `<div class="total"><span class="muted">${htmlEscape(input.totalLabel)}:</span> <strong>${htmlEscape(totalText)}</strong></div>${table}`,
  });
}
