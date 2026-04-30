/**
 * Semantic color tokens — from Figma 02 Tokens collection.
 * Always prefer these over palette/* in UI code.
 *
 * Source: docs/dev/08-Nestory_DesignTokens0429.json
 */
import { palette } from './primitives';

export const text = {
  primary:   palette.neutral[900],     // #1a1a1a
  secondary: palette.neutral[500],     // #8a8a8a
  hint:      palette.neutral[400],     // #a3a3a3
  onColor:   palette.neutral.white,    // #ffffff
  brand:     palette.primary[700],     // #177a48
  premium:   palette.accent[900],      // #78350f (redefined 2026-04-29 from accent/600 → accent/900)
  disabled:  palette.neutral[600],     // #525252
  success:   palette.notify.success.strong, // #166534
  error:     palette.notify.error.strong,   // #991b1b
  warning:   palette.notify.warning.strong, // #92400e
  info:      palette.notify.info.strong,    // #1e40af
} as const;

export const surface = {
  default:        palette.neutral[50],          // #fefcfa
  muted:          palette.neutral[50],          // #fefcfa
  card:           palette.neutral.white,        // #ffffff
  brand:          palette.primary[500],         // #23ab65
  brandSubtle:    palette.primary[50],          // #edfbf2
  premium:        palette.accent[500],          // #f59e0b
  premiumSubtle:  palette.accent[50],           // #fff8eb
  successSubtle:  palette.notify.success.subtle, // #f0fdf4
  errorSubtle:    palette.notify.error.subtle,   // #fef2f2
  warningSubtle:  palette.notify.warning.subtle, // #fffbeb
  infoSubtle:     palette.notify.info.subtle,    // #eff6ff
  disabled:       palette.neutral[200],         // #ededed
} as const;

export const border = {
  default:  palette.neutral[200],         // #ededed
  strong:   palette.neutral[300],         // #d4d4d4
  brand:    palette.primary[500],         // #23ab65
  premium:  palette.accent[500],          // #f59e0b
  success:  palette.notify.success.border, // #bbf7d0
  error:    palette.notify.error.border,   // #fecaca
  warning:  palette.notify.warning.border, // #fef3c7
  info:     palette.notify.info.border,    // #dbeafe
  disabled: palette.neutral[400],          // #a3a3a3
} as const;

export const overlay = {
  scrim:     palette.overlay.overlay65,  // rgba(0,0,0,0.65) — modal scrim
  highlight: palette.overlay.overlay30,  // rgba(255,255,255,0.3) — light highlight on dark
} as const;
