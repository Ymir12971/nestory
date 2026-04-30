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
export { palette, fontFamily, fontSize, fontWeight } from './primitives.js';
export type { FontWeight } from './primitives.js';
export { text, surface, border, overlay } from './colors.js';
export { typography } from './typography.js';
export type { TypographyVariant } from './typography.js';
export { spacing } from './spacing.js';
export type { SpacingToken } from './spacing.js';
export { radius } from './radius.js';
export type { RadiusToken } from './radius.js';

import { text, surface, border, overlay } from './colors.js';
import { typography } from './typography.js';
import { spacing } from './spacing.js';
import { radius } from './radius.js';

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
