import { buildStatementHtml, htmlEscape } from './pdfHtml';

describe('buildStatementHtml', () => {
  const html = buildStatementHtml({
    title: 'Apna Hisab statement',
    rangeLabel: '01 Oct 2026 – 31 Oct 2026',
    generatedLabel: 'Generated on 05 Oct 2026',
    totals: [
      { label: 'Total income', paise: 25000000, kind: 'income' },
      { label: 'Total expense', paise: 50025, kind: 'expense' },
      { label: 'Net', paise: 24949975, kind: 'net' },
    ],
    tables: [
      { title: 'Transactions', header: ['Date', 'Amount'], rows: [[{ text: '2026-10-03' }, { paise: -50025 }], [{ text: '2026-10-04' }, { paise: 25000000 }]] },
      { title: 'Udhaar', header: ['Person', 'Amount'], rows: [[{ text: '<Ramesh>' }, { paise: 200000 }]] },
      { title: 'Empty', header: ['X'], rows: [] },
    ],
  });

  it('is UTF-8 HTML with the title and range', () => {
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<h1>Apna Hisab statement</h1>');
    expect(html).toContain('01 Oct 2026 – 31 Oct 2026');
  });

  it('shows totals with Indian grouping and signs, never colour alone', () => {
    expect(html).toContain('+₹2,50,000');
    expect(html).toContain('−₹500.25');
    expect(html).toContain('+₹2,49,499.75');
  });

  it('signs transaction amounts but not Udhaar amounts, and escapes text', () => {
    expect(html).toContain('<td class="num"><span class="expense">−₹500.25</span></td>');
    expect(html).toContain('<td class="num">₹2,000</td>');
    expect(html).toContain('&lt;Ramesh&gt;');
  });

  it('skips empty tables', () => {
    expect(html).not.toContain('<h2>Empty</h2>');
  });
});

describe('htmlEscape', () => {
  it('escapes markup characters', () => {
    expect(htmlEscape('a & "b" <c>')).toBe('a &amp; &quot;b&quot; &lt;c&gt;');
  });
});
