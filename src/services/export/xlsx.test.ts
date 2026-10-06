import { strFromU8, unzipSync } from 'fflate';
import { buildXlsx, sheetName, xmlEscape } from './xlsx';
import type { Table } from './rows';

const table: Table = {
  title: 'लेन-देन',
  header: ['Date', 'Amount (₹)', 'Note'],
  rows: [
    [{ text: '2026-10-03' }, { paise: -50025 }, { text: 'Tea & <snacks>' }],
    [{ text: '2026-10-04' }, { paise: 120000 }, { text: '' }],
  ],
};

describe('buildXlsx', () => {
  const files = unzipSync(buildXlsx([table, { title: 'Udhaar', header: ['Person'], rows: [[{ text: 'Ramesh' }]] }]));

  it('contains a workbook with one sheet per table', () => {
    expect(Object.keys(files).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ]);
    const workbook = strFromU8(files['xl/workbook.xml']);
    expect(workbook).toContain('<sheet name="लेन-देन" sheetId="1" r:id="rId1"/>');
    expect(workbook).toContain('<sheet name="Udhaar" sheetId="2" r:id="rId2"/>');
  });

  it('writes a bold header, numeric amounts in rupees and escaped text', () => {
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Date</t></is></c>');
    expect(sheet).toContain('<c r="B2" s="2"><v>-500.25</v></c>');
    expect(sheet).toContain('<c r="B3" s="2"><v>1200.00</v></c>');
    expect(sheet).toContain('Tea &amp; &lt;snacks&gt;');
  });
});

describe('xmlEscape', () => {
  it('drops control characters that would corrupt the XML', () => {
    expect(xmlEscape('a\u0001b\tc\nd"')).toBe('ab\tc\nd&quot;');
  });
});

describe('sheetName', () => {
  it('removes forbidden characters and caps the length at 31', () => {
    expect(sheetName('a/b:c*d?', 0)).toBe('a b c d');
    expect(sheetName('x'.repeat(40), 0)).toHaveLength(31);
    expect(sheetName('???', 2)).toBe('Sheet3');
  });
});
