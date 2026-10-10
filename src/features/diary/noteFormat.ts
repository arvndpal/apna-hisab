import type { Language } from '../../types/models';

/** "09 Oct 2026, 10:45 AM" — an absolute stamp (not relative) per card, Western digits in Hindi too. */
export function formatNoteStamp(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    numberingSystem: 'latn',
  }).format(new Date(iso));
}
