/**
 * Sanitizers for the numeric text fields in the child profile form.
 *
 * These run on every keystroke, so they tolerate half-typed input: "5." is a
 * legal thing to be in the middle of typing and survives, while "5.5.5" and
 * letters do not. They return a string, never a number — the field keeps
 * showing what the user typed until it is parsed at save time.
 *
 * Over-range input is refused rather than clamped: the offending character is
 * dropped, so the field never silently rewrites a number the user is still
 * typing. Typing "15" into inches leaves "1".
 */

/** Trims trailing characters until the value fits, so pasted input is handled too. */
function fitToMax(digits: string, max: number): string {
  let out = digits;
  while (out.length > 0 && Number(out) > max) out = out.slice(0, -1);
  return out;
}

/** Digits only, optionally bounded. Feet and inches are whole numbers. */
export function intOnly(value: string, max?: number): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits === '' || max === undefined) return digits;
  return fitToMax(digits, max);
}

/**
 * Digits with at most `places` decimals, optionally bounded. Two places is
 * what the column holds — children.height_value and weight_value are
 * Decimal(6,2) — so anything finer is rounded away by the database anyway.
 */
export function decimalOnly(value: string, places = 2, max?: number): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  const trimmed =
    firstDot === -1
      ? cleaned
      : `${cleaned.slice(0, firstDot)}.${cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, places)}`;

  if (max === undefined || trimmed === '' || trimmed === '.') return trimmed;
  // A trailing dot is mid-typing, not a value to range-check.
  if (trimmed.endsWith('.')) {
    return Number(trimmed.slice(0, -1)) > max ? trimmed.slice(0, -2) + '.' : trimmed;
  }
  if (Number(trimmed) <= max) return trimmed;
  let out = trimmed;
  while (out.length > 0 && (out.endsWith('.') || Number(out) > max)) out = out.slice(0, -1);
  return out;
}

/**
 * Bounds for the child profile fields. The birthday picker only offers the
 * last ten years, so these describe a child aged 0-10 with generous headroom:
 * 7'11" is about 241cm. Inches stops at 11 because twelve of them is a foot —
 * that one is arithmetic, not a product call.
 */
export const HEIGHT_MAX = { cm: 250, ft: 7, inches: 11 } as const;
