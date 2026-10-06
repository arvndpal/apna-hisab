import { bytesToBase64, utf8ToBase64 } from './base64';

describe('utf8ToBase64', () => {
  it.each([
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['a,b\r\n', 'YSxiDQo='],
  ])('encodes %j like Node', (input, expected) => {
    expect(utf8ToBase64(input)).toBe(expected);
  });

  it('encodes Devanagari, ₹, the BOM and emoji as UTF-8', () => {
    const text = '﻿खाना ₹500 🙂';
    expect(utf8ToBase64(text)).toBe(Buffer.from(text, 'utf8').toString('base64'));
  });
});

describe('bytesToBase64', () => {
  it('encodes arbitrary bytes, including zeros and 0xFF', () => {
    const bytes = Uint8Array.from([0, 255, 16, 128, 1, 2, 3]);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });
});
