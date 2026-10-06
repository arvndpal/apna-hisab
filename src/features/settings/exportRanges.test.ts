import { exportFileStem, getExportRange } from './exportRanges';

const TODAY = new Date(2026, 9, 5); // 5 Oct 2026

describe('getExportRange', () => {
  it('covers the whole current month', () => {
    expect(getExportRange('thisMonth', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('covers the previous month, across a year boundary', () => {
    expect(getExportRange('lastMonth', TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(getExportRange('lastMonth', new Date(2026, 0, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('handles February in a leap year', () => {
    expect(getExportRange('thisMonth', new Date(2028, 1, 10))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('covers the calendar year', () => {
    expect(getExportRange('thisYear', TODAY)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('orders a reversed custom range', () => {
    const range = getExportRange('custom', TODAY, { from: new Date(2026, 8, 20), to: new Date(2026, 8, 3) });
    expect(range).toEqual({ from: '2026-09-03', to: '2026-09-20' });
  });
});

describe('exportFileStem', () => {
  it('names the file after its kind and range', () => {
    expect(exportFileStem('udhaar', { from: '2026-10-01', to: '2026-10-31' })).toBe('apna-hisab-udhaar_2026-10-01_2026-10-31');
  });
});
