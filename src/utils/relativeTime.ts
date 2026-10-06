import type { TFunction } from 'i18next';
import type { Language } from '../types/models';

/**
 * "just now" / "2 min ago" / "3 hours ago", then a plain date — for "Last synced …" (SCREENS.md §19).
 * Hand-rolled rather than Intl.RelativeTimeFormat, which Hermes doesn't ship on Android.
 */
export function formatSince(iso: string, t: TFunction, language: Language, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    numberingSystem: 'latn',
  }).format(then);
}

/** "21:00" → "9:00 PM" (Western digits in Hindi too, per ARCHITECTURE.md §13). */
export function formatClock(hhmm: string, language: Language): string {
  const [h, m] = hhmm.split(':').map(Number);
  const date = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    numberingSystem: 'latn',
  })
    .format(date)
    .toUpperCase();
}
