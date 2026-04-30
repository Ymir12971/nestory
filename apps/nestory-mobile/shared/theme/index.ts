/**
 * Theme entry point. Import everything from here:
 *
 *   import { theme } from '@/shared/theme';
 *   <View style={{ backgroundColor: theme.surface.card, padding: theme.spacing.l }} />
 *
 * Or pull individual slices:
 *
 *   import { typography, spacing } from '@/shared/theme';
 */
export { palette, fontFamily, fontSize, fontWeight } from './primitives';
export type { FontWeight } from './primitives';
export { text, surface, border, overlay } from './colors';
export { typography } from './typography';
export type { TypographyVariant } from './typography';
export { spacing } from './spacing';
export type { SpacingToken } from './spacing';
export { radius } from './radius';
export type { RadiusToken } from './radius';

import { text, surface, border, overlay } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';

/**
 * Aggregated theme object. Use this for ergonomic access in components.
 */
export const theme = {
  text,
  surface,
  border,
  overlay,
  typography,
  spacing,
  radius,
} as const;

export type Theme = typeof theme;
