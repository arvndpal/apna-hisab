/** Calendar grid math shared by CustomRange's date-range picker and the Financial Calendar. */

/** Monday-start 6-week (42-cell) grid for `year`/`month` (0-indexed) — `null` for the leading/trailing blanks outside the month. */
export function monthMatrix(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length < 42) cells.push(null);
  return cells;
}
