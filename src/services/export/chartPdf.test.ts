import { barsSvg, buildIncomeExpenseHtml, groupByMonth, MAX_DAILY_BARS, niceMax, trendSvg, type SeriesPoint } from './chartPdf';

const colors = { income: '#137A43', expense: '#E8875B' };
const points: SeriesPoint[] = [
  { label: '01 Oct', day: '2026-10-01', incomePaise: 200000, expensePaise: 50000 },
  { label: '02 Oct', day: '2026-10-02', incomePaise: 0, expensePaise: 0 },
  { label: '03 Oct', day: '2026-10-03', incomePaise: 0, expensePaise: 75025 },
];

describe('niceMax', () => {
  it('picks a maximum whose quarter is a round step at or above the data', () => {
    expect(niceMax(0)).toBe(400);
    expect(niceMax(226299)).toBe(240000); // steps of ₹600
    expect(niceMax(180000)).toBe(200000); // steps of ₹500
    expect(niceMax(100000)).toBe(100000);
    expect(niceMax(100001)).toBe(120000);
  });
});

describe('barsSvg', () => {
  it('draws a bar only for non-zero values, in each series colour', () => {
    const svg = barsSvg(points, colors);
    expect(svg.match(/<rect /g)).toHaveLength(3);
    expect(svg).toContain(`fill="${colors.income}"`);
    expect(svg).toContain(`fill="${colors.expense}"`);
    expect(svg).toContain('>01 Oct<');
  });
});

describe('trendSvg', () => {
  it('draws one line per series through every point', () => {
    const svg = trendSvg(points, colors);
    expect(svg.match(/<polyline /g)).toHaveLength(2);
    const firstLine = svg.match(/<polyline points="([^"]+)"/)![1];
    expect(firstLine.split(' ')).toHaveLength(3);
  });
});

describe('groupByMonth', () => {
  it('keeps short ranges daily', () => {
    expect(groupByMonth(points, (m) => m)).toBe(points);
  });

  it('sums long ranges into months', () => {
    const year: SeriesPoint[] = Array.from({ length: MAX_DAILY_BARS + 10 }, (_, i) => {
      const d = new Date(2026, 0, 1 + i);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { label: day, day, incomePaise: 100, expensePaise: 10 };
    });
    const months = groupByMonth(year, (m) => `M${m}`);
    expect(months.map((m) => m.label)).toEqual(['M2026-01', 'M2026-02', 'M2026-03']);
    expect(months[0].incomePaise).toBe(3100);
    expect(months.reduce((s, m) => s + m.expensePaise, 0)).toBe(year.length * 10);
  });
});

describe('buildIncomeExpenseHtml', () => {
  const html = buildIncomeExpenseHtml({
    kind: 'bars',
    title: 'Income vs Expense',
    rangeLabel: 'October 2026',
    generatedLabel: 'Generated on 10 Oct 2026',
    labels: { income: 'Income', expense: 'Expense', net: 'Net', date: 'Date' },
    colors,
    points,
    monthLabel: (m) => m,
  });

  it('has the chart, signed totals and a row per day with money', () => {
    expect(html).toContain('<svg');
    expect(html).toContain('+₹2,000');
    expect(html).toContain('−₹1,250.25');
    expect(html).toContain('+₹749.75');
    expect(html).toContain('<td>01 Oct</td>');
    expect(html).not.toContain('<td>02 Oct</td>');
    // Empty side of a day reads "—", never a signed zero.
    expect(html).toContain('<td>03 Oct</td><td class="num">—</td>');
    expect(html).not.toMatch(/[+\u2212]₹0</);
  });
});
