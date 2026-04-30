/**
 * Border radius tokens — from Figma 01 Primitive / Number / Radius.
 *
 * Source: docs/dev/08-Nestory_DesignTokens0429.json
 */

export const radius = {
  none: 0,    // None-0
  s:    6,    // S-6
  m:    10,   // M-10
  l:    16,   // L-16
  full: 999,  // Full — pill / circle
} as const;

export type RadiusToken = keyof typeof radius;
