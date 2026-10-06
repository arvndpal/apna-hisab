import { monthMatrix } from './calendarMatrix';

describe('monthMatrix', () => {
  it('is always exactly 42 cells (6 Monday-start weeks)', () => {
    expect(monthMatrix(2026, 9)).toHaveLength(42); // October 2026
  });

  it('pads the correct number of leading blanks before the 1st', () => {
    // October 1, 2026 is a Thursday → Mon=0..Thu=3 leading blanks.
    const cells = monthMatrix(2026, 9);
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]?.getDate()).toBe(1);
  });

  it('lists every day of the month in order with no gaps', () => {
    const cells = monthMatrix(2026, 9); // October — 31 days
    const days = cells.filter((d): d is Date => d !== null).map((d) => d.getDate());
    expect(days).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it('pads trailing blanks after the last day', () => {
    const cells = monthMatrix(2026, 9);
    let lastDayIndex = -1;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i] !== null) {
        lastDayIndex = i;
        break;
      }
    }
    expect(cells[lastDayIndex]?.getDate()).toBe(31);
    expect(cells.slice(lastDayIndex + 1).every((d) => d === null)).toBe(true);
  });

  it('starts the week on Monday with no leading blanks when the 1st is itself a Monday', () => {
    // June 1, 2026 is a Monday.
    const cells = monthMatrix(2026, 5);
    expect(cells[0]?.getDate()).toBe(1);
  });
});
