/**
 * Primitive tokens — raw values from Figma 01 Primitive collection.
 * Source of truth: docs/dev/08-Nestory_DesignTokens0429.json
 *
 * Don't reference these directly in UI code. Use semantic tokens (colors.ts)
 * unless you genuinely need a raw palette step.
 */

export const palette = {
  primary: {
    50:  '#edfbf2',
    100: '#d1f5de',
    200: '#a6ecbf',
    300: '#6fdb99',
    400: '#3ec878',
    500: '#23ab65',
    600: '#1d9457',
    700: '#177a48',
    800: '#12613a',
    900: '#0d4f2f',
    950: '#093d24',
  },
  accent: {
    50:  '#fff8eb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  neutral: {
    50:  '#fefcfa',
    100: '#f5f5f5',
    200: '#ededed',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#8a8a8a',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#1a1a1a',
    white: '#ffffff',
    black: '#000000',
  },
  notify: {
    success: { subtle: '#f0fdf4', border: '#bbf7d0', main: '#22c55e', strong: '#166534' },
    error:   { subtle: '#fef2f2', border: '#fecaca', main: '#dc2626', strong: '#991b1b' },
    warning: { subtle: '#fffbeb', border: '#fef3c7', main: '#f59e0b', strong: '#92400e' },
    info:    { subtle: '#eff6ff', border: '#dbeafe', main: '#3b82f6', strong: '#1e40af' },
  },
  overlay: {
    overlay65: 'rgba(0, 0, 0, 0.65)',
    overlay30: 'rgba(255, 255, 255, 0.3)',
  },
} as const;

export const fontFamily = {
  primary: 'Manrope',
  secondary: 'Inter',
} as const;

export const fontSize = {
  xs10:  10,
  s12:   12,
  m14:   14,
  reg16: 16,
  h4_14: 14,
  h3_16: 16,
  h2_18: 18,
  h1_28: 28,
} as const;

export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
} as const;

export type FontWeight = (typeof fontWeight)[keyof typeof fontWeight];
