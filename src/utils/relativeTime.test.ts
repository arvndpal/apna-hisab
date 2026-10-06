import type { TFunction } from 'i18next';
import { formatClock, formatSince } from './relativeTime';

const t = ((key: string, opts?: { count?: number }) => (opts?.count != null ? `${key}:${opts.count}` : key)) as unknown as TFunction;
const NOW = new Date('2026-10-05T12:00:00Z');

describe('formatSince', () => {
  it('says just now under a minute', () => {
    expect(formatSince('2026-10-05T11:59:30Z', t, 'en', NOW)).toBe('time.justNow');
  });

  it('counts minutes, then hours', () => {
    expect(formatSince('2026-10-05T11:58:00Z', t, 'en', NOW)).toBe('time.minutesAgo:2');
    expect(formatSince('2026-10-05T09:00:00Z', t, 'en', NOW)).toBe('time.hoursAgo:3');
  });

  it('falls back to a date after a day', () => {
    expect(formatSince('2026-10-01T09:00:00Z', t, 'en', NOW)).toMatch(/Oct/);
  });
});

describe('formatClock', () => {
  it('formats 24h settings as a 12h clock', () => {
    expect(formatClock('21:00', 'en')).toBe('9:00 PM');
    expect(formatClock('09:05', 'en')).toBe('9:05 AM');
  });

  it('keeps Western digits in Hindi', () => {
    expect(formatClock('21:00', 'hi')).toMatch(/9:00/);
  });
});
