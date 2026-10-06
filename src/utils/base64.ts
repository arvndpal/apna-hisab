/* eslint-disable no-bitwise -- UTF-8 and base64 encoding are bit manipulation by definition. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** UTF-8 bytes of a JS string — Devanagari names/notes must survive into the exported file. */
function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return bytes;
}

/** Base64 of raw bytes (an .xlsx zip, …), without a Buffer polyfill. */
export function bytesToBase64(bytes: ArrayLike<number>): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const c = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    out += b === undefined ? '=' : ALPHABET[(n >> 6) & 63];
    out += c === undefined ? '=' : ALPHABET[n & 63];
  }
  return out;
}

/** Base64 of the UTF-8 encoding — for react-native-share's `data:` URLs. */
export function utf8ToBase64(text: string): string {
  return bytesToBase64(utf8Bytes(text));
}
