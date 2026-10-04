/** Date helpers shared by repositories. occurred_at keeps the local offset; occurred_on is local YYYY-MM-DD. */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** UTC ISO 8601, for created_at / updated_at. */
export function nowUtcIso(): string {
  return new Date().toISOString();
}

/** ISO 8601 with the device's local offset, e.g. 2026-10-03T09:05:00+05:30. */
export function toLocalIso(date: Date): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset}`
  );
}

/** Local YYYY-MM-DD, for occurred_on / day grouping / calendar queries. */
export function toOccurredOn(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
