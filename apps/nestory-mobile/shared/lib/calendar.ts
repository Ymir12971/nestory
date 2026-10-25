/** Shared by the wheel date pickers (O-Child birthday, H-02 Moment date & time). */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * How many years back the date wheels reach. Covers a child through age 17 —
 * the birthday wheel stopping at 2017 locked out older siblings — and the
 * Moment wheel offers the same span so any of their moments can be dated.
 */
export const PICKER_YEAR_SPAN = 18;

/** Year labels for a wheel, oldest first, ending at `lastYear`. */
export function pickerYears(lastYear: number, span = PICKER_YEAR_SPAN): string[] {
  return Array.from({ length: span }, (_, i) => String(lastYear - span + 1 + i));
}

/** Days in the month; `monthIdx` is 0-based. Day 0 of the next month is this month's last day. */
export function daysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

/** Day labels for a wheel: "1" … the month's last day, so November never offers 31. */
export function dayLabels(year: number, monthIdx: number): string[] {
  return Array.from({ length: daysInMonth(year, monthIdx) }, (_, i) => String(i + 1));
}
