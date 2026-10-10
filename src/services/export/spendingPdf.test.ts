import { buildSpendingHtml, donutSvg, sliceColor } from './spendingPdf';

const slices = [
  { label: 'खाना', amountPaise: 300000, share: 0.6, color: '#0A7A5E' },
  { label: 'Fuel <car>', amountPaise: 150000, share: 0.3, color: '#C2410C' },
  { label: 'Rent', amountPaise: 50000, share: 0.1, color: '#E8A04B' },
];

describe('donutSvg', () => {
  it('draws one arc per slice, laid end to end around the circle', () => {
    const svg = donutSvg(slices, 'Total', '₹5,000');
    const arcs = svg.match(/<circle /g) ?? [];
    expect(arcs).toHaveLength(3);
    const circumference = 2 * Math.PI * 70;
    expect(svg).toContain(`stroke-dasharray="${(0.6 * circumference).toFixed(3)} ${(0.4 * circumference).toFixed(3)}"`);
    // Second arc starts where the first ended.
    expect(svg).toContain(`stroke-dashoffset="${(-0.6 * circumference).toFixed(3)}"`);
    expect(svg).toContain('₹5,000');
  });

  it('skips empty slices', () => {
    expect(donutSvg([{ label: 'x', amountPaise: 0, share: 0, color: '#000' }], 'Total', '₹0').match(/<circle /g)).toBeNull();
  });
});

describe('buildSpendingHtml', () => {
  const html = buildSpendingHtml({
    title: 'Where did you spend?',
    rangeLabel: 'October 2026',
    generatedLabel: 'Generated on 10 Oct 2026',
    totalLabel: 'Total',
    columns: { category: 'Category', amount: 'Amount', share: 'Share' },
    slices,
  });

  it('lists every category with amount and share, escaped', () => {
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<h1>Where did you spend?</h1>');
    expect(html).toContain('खाना</td><td class="num">₹3,000</td><td class="num">60%</td>');
    expect(html).toContain('Fuel &lt;car&gt;');
    expect(html).toContain('Rent</td><td class="num">₹500</td><td class="num">10%</td>');
  });

  it('shows the total with Indian grouping', () => {
    expect(html).toContain('<strong>₹5,000</strong>');
  });
});

describe('sliceColor', () => {
  const palette = ['#0A7A5E', '#C2410C', '#E8A04B', '#3949A8', '#A3ADA8'];

  it('matches the app chart for the first five slices', () => {
    expect([0, 1, 2, 3, 4].map((i) => sliceColor(i, palette))).toEqual(palette);
  });

  it('uses a lighter tint after that, so the 6th never repeats the 1st', () => {
    expect(sliceColor(5, palette)).toBe('#54A28E');
    expect(sliceColor(5, palette)).not.toBe(sliceColor(0, palette));
    expect(sliceColor(10, palette)).not.toBe(sliceColor(5, palette));
  });
});
