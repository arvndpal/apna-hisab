import {
  applyKey,
  formatCompact,
  formatPaise,
  formatRawForDisplay,
  formatRupees,
  paiseToRaw,
  rawToPaise,
  MAX_AMOUNT_PAISE,
} from './money';

describe('formatPaise', () => {
  it('formats with Indian grouping and no symbol', () => {
    expect(formatPaise(285000)).toBe('2,850');
    expect(formatPaise(12345)).toBe('123.45');
    expect(formatPaise(100000000)).toBe('10,00,000');
  });

  it('drops the sign (uses absolute value)', () => {
    expect(formatPaise(-285000)).toBe('2,850');
  });
});

describe('formatRupees', () => {
  it('adds the income + sign and arrow-ready prefix', () => {
    expect(formatRupees(285000, 'income')).toBe('+₹2,850');
  });

  it('uses U+2212 minus for expense, not a hyphen', () => {
    expect(formatRupees(50000, 'expense')).toBe('−₹500');
  });

  it('signs net by value, and shows plain ₹0 at zero', () => {
    expect(formatRupees(100, 'net')).toBe('+₹1');
    expect(formatRupees(-100, 'net')).toBe('−₹1');
    expect(formatRupees(0, 'net')).toBe('₹0');
  });

  it('neutral has no sign by default', () => {
    expect(formatRupees(50000, 'neutral')).toBe('₹500');
  });

  it('respects an explicit showSign override', () => {
    expect(formatRupees(50000, 'income', false)).toBe('₹500');
  });
});

describe('formatCompact', () => {
  it('compacts thousands, lakhs and crores', () => {
    expect(formatCompact(210000)).toBe('2.1K');
    expect(formatCompact(125000000)).toBe('12.5L');
    expect(formatCompact(1500000000)).toBe('1.5Cr');
  });

  it('drops a trailing .0', () => {
    expect(formatCompact(100000000)).toBe('10L');
  });

  it('signs when asked', () => {
    expect(formatCompact(210000, true)).toBe('+2.1K');
    expect(formatCompact(-210000, true)).toBe('−2.1K');
  });
});

describe('applyKey (keypad input)', () => {
  it('builds up digits', () => {
    expect(applyKey('1', '2')).toBe('12');
    expect(applyKey('', '5')).toBe('5');
  });

  it('blocks leading zeros', () => {
    expect(applyKey('0', '5')).toBe('5');
  });

  it('allows a single decimal point, starting with "0."', () => {
    expect(applyKey('', '.')).toBe('0.');
    expect(applyKey('12', '.')).toBe('12.');
    expect(applyKey('12.5', '.')).toBe('12.5');
  });

  it('caps at 2 decimal places', () => {
    expect(applyKey('12.50', '5')).toBe('12.50');
  });

  it('backspace removes the last character', () => {
    expect(applyKey('123', 'backspace')).toBe('12');
  });

  it('clear empties the input', () => {
    expect(applyKey('123.45', 'clear')).toBe('');
  });

  it('refuses a digit that would exceed the max amount', () => {
    const atMax = String(MAX_AMOUNT_PAISE / 100);
    expect(applyKey(atMax, '9')).toBe(atMax);
  });
});

describe('rawToPaise / paiseToRaw round-trip', () => {
  it('converts raw keypad strings to paise', () => {
    expect(rawToPaise('1250.5')).toBe(125050);
    expect(rawToPaise('500')).toBe(50000);
    expect(rawToPaise('')).toBe(0);
  });

  it('converts paise back to a raw string for editing', () => {
    expect(paiseToRaw(125050)).toBe('1250.5');
    expect(paiseToRaw(50000)).toBe('500');
  });
});

describe('formatRawForDisplay', () => {
  it('groups the integer part while typing', () => {
    expect(formatRawForDisplay('125000')).toBe('1,25,000');
    expect(formatRawForDisplay('125000.5')).toBe('1,25,000.5');
    expect(formatRawForDisplay('')).toBe('0');
  });
});
