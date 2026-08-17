/**
 * Sanitizers for the numeric text fields in the child profile form.
 *
 * These run on every keystroke, so they have to tolerate half-typed input:
 * "5." is a legal thing to be in the middle of typing and must survive, while
 * "5.5.5" or "abc" must not. They return a string, never a number — the field
 * keeps showing exactly what the user typed until it is parsed at save time.
 */

/** Digits only — feet and inches (Justin 2026-08-09: 整数). */
export function intOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

/**
 * Digits with at most `places` decimals. Two by default, which is what the
 * column holds: children.height_value and weight_value are Decimal(6,2), so
 * anything finer is silently rounded away by the database anyway.
 */
export function decimalOnly(value: string, places = 2): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  const whole = cleaned.slice(0, firstDot);
  // Drop any further dots, then trim the fraction.
  const fraction = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, places);
  return `${whole}.${fraction}`;
}
