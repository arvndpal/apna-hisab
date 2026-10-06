import { utf8ToBase64 } from './base64';

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
