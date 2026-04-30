/**
 * Typography styles — from Figma Text Styles.
 * Each entry is a complete RN TextStyle (family + size + weight + lineHeight).
 *
 * Source: docs/dev/08-Nestory_DesignTokens0429.json + Figma Text Style metadata
 *
 * NOTE: lineHeight values come from Figma directly (not in JSON yet — see audit doc §3).
 */
import type { TextStyle } from 'react-native';
import { fontFamily, fontSize, fontWeight } from './primitives.js';

const manrope = fontFamily.primary;
const inter = fontFamily.secondary;

export const typography = {
  h1: {
    fontFamily: manrope,
    fontSize: fontSize.h1_28,    // 28
    fontWeight: fontWeight.bold, // 700
    lineHeight: 38,
  },
  h2: {
    fontFamily: manrope,
    fontSize: fontSize.h2_18,    // 18
    fontWeight: fontWeight.bold, // 700
    lineHeight: 24,
  },
  h3: {
    fontFamily: manrope,
    fontSize: fontSize.h3_16,        // 16
    fontWeight: fontWeight.semibold, // 600
    lineHeight: 22,
  },
  h4: {
    fontFamily: manrope,
    fontSize: fontSize.h4_14,        // 14
    fontWeight: fontWeight.semibold, // 600
    lineHeight: 20,
  },
  body: {
    fontFamily: inter,
    fontSize: fontSize.reg16,       // 16
    fontWeight: fontWeight.regular, // 400
    lineHeight: 20,
  },
  caption: {
    fontFamily: inter,
    fontSize: fontSize.m14,         // 14
    fontWeight: fontWeight.regular, // 400
    lineHeight: 16,
  },
  buttonLabelM: {
    fontFamily: manrope,
    fontSize: fontSize.reg16,    // 16
    fontWeight: fontWeight.bold, // 700
    lineHeight: 22,
  },
  buttonLabelS: {
    fontFamily: manrope,
    fontSize: fontSize.m14,          // 14
    fontWeight: fontWeight.semibold, // 600
    lineHeight: 20,
  },
  tagBadge: {
    fontFamily: inter,
    fontSize: fontSize.s12,        // 12
    fontWeight: fontWeight.medium, // 500
    lineHeight: 16,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
