/**
 * Typography styles — from Figma Text Styles.
 * Each entry is a complete RN TextStyle (family + size + lineHeight).
 *
 * Source: docs/dev/08-Nestory_DesignTokens0429.json + Figma Text Style metadata
 *
 * Font weights are encoded in the family name (Manrope_700Bold, etc.)
 * because @expo-google-fonts ships one TTF per weight. Don't add a separate
 * `fontWeight` here — RN would try to synthesize a bold on top of the already-bold file.
 *
 * Loaded in app/_layout.tsx via useFonts({ Manrope_*Regular, ..., Inter_*Regular, ... }).
 */
import type { TextStyle } from 'react-native';

export const typography = {
  h1:           { fontFamily: 'Manrope_700Bold',     fontSize: 28, lineHeight: 38 },
  h2:           { fontFamily: 'Manrope_700Bold',     fontSize: 18, lineHeight: 24 },
  h3:           { fontFamily: 'Manrope_600SemiBold', fontSize: 16, lineHeight: 22 },
  h4:           { fontFamily: 'Manrope_600SemiBold', fontSize: 14, lineHeight: 20 },
  body:         { fontFamily: 'Inter_400Regular',    fontSize: 16, lineHeight: 20 },
  caption:      { fontFamily: 'Inter_400Regular',    fontSize: 14, lineHeight: 16 },
  buttonLabelM: { fontFamily: 'Manrope_700Bold',     fontSize: 16, lineHeight: 22 },
  buttonLabelS: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, lineHeight: 20 },
  tagBadge:     { fontFamily: 'Inter_500Medium',     fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
