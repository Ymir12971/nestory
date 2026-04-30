/**
 * Spacing tokens — from Figma 01 Primitive / Number / Spacing.
 * Used for padding, margin, gap.
 *
 * Source: docs/dev/08-Nestory_DesignTokens0429.json
 */

export const spacing = {
  xs:      4,   // XS-4
  s:       8,   // S-8
  m:       12,  // M-12
  l:       16,  // L-16
  xl:      20,  // XL-20
  xxl:     24,  // XXL-24
  safeBtm: 34,  // SafeBtm — bottom safe area inset for non-notched devices
} as const;

export type SpacingToken = keyof typeof spacing;
