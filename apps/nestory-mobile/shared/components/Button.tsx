import { type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, theme } from '@/shared/theme';

/**
 * DS Button — Figma `Design System · 02 Atoms · Button` (47:475).
 *
 * 6 types × 3 states, transcribed 1:1 from the redesign file
 * (wS1hJeZhXMkUnn8YwLtFcv), verified 2026-08-05:
 *
 *   primary     52h  gradient primary/500→400 + 2px primary/50 ring, white label
 *   secondary   52h  white fill + 1px border/brand, brand label
 *   premium     52h  gradient accent/400→300 + 2px accent/50 ring, premium label
 *   small       36h  primary gradient, minWidth 72, px 16
 *   text        40h  no fill, brand label, px 8
 *   destructive 40h  no fill, error label, px 8
 *
 * Every type shares the ButtonLabel-M text style (Manrope Bold 16/22) and a
 * full pill radius. `Status=Pressed` is wired to the real press state, so the
 * pressed gradients/fills in the design happen for free.
 */
export type ButtonType = 'primary' | 'secondary' | 'premium' | 'small' | 'text' | 'destructive';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  type?: ButtonType;
  /** Rendered before the label (icon, crown, …). */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

const GRADIENT = {
  primaryDefault: [palette.primary[500], palette.primary[400]],
  primaryPressed: [palette.primary[600], palette.primary[500]],
  premiumDefault: [palette.accent[400], palette.accent[300]],
  premiumPressed: [palette.accent[600], palette.accent[500]],
} as const;

/** Which types render a gradient fill, and with which stops. */
function gradientFor(type: ButtonType, pressed: boolean): readonly [string, string] | null {
  if (type === 'primary' || type === 'small') {
    return pressed ? GRADIENT.primaryPressed : GRADIENT.primaryDefault;
  }
  if (type === 'premium') {
    return pressed ? GRADIENT.premiumPressed : GRADIENT.premiumDefault;
  }
  return null;
}

function labelColor(type: ButtonType, disabled: boolean): string {
  if (disabled) return theme.text.disabled; // #525252
  switch (type) {
    case 'secondary':
    case 'text':
      return theme.text.brand; // #177a48
    case 'premium':
      return theme.text.premium; // #78350f
    case 'destructive':
      return theme.text.error; // #991b1b
    default:
      return theme.text.onColor; // white
  }
}

export function Button({ label, type = 'primary', icon, style, labelStyle, ...rest }: Props) {
  const disabled = rest.disabled ?? false;

  // Sizing belongs on the Pressable, because the Pressable — not the gradient
  // inside it — is the flex item the parent lays out. With the height and
  // `alignSelf: stretch` on the inner view instead, any parent that centres its
  // children (every `sheetSection.cta`) shrank the Pressable to the label's
  // width, and the design's 353-wide bar rendered as a pill hugging its text.
  // It also put caller `style` overrides on the wrong node.
  return (
    <Pressable accessibilityRole="button" {...rest} style={[s[type], style]}>
      {({ pressed }) => {
        const gradient = disabled ? null : gradientFor(type, pressed);
        const fill = [
          s.fill,
          s[`${type}Padding` as const],
          disabled ? s[`${type}Disabled` as const] : pressed ? s[`${type}Pressed` as const] : s[`${type}Default` as const],
        ];
        const content = (
          <>
            {icon}
            <Text style={[s.label, { color: labelColor(type, disabled) }, labelStyle]}>{label}</Text>
          </>
        );

        return gradient ? (
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fill}>
            {content}
          </LinearGradient>
        ) : (
          <View style={fill}>{content}</View>
        );
      }}
    </Pressable>
  );
}

const s = StyleSheet.create({
  /** Inner layer: fills the Pressable and carries every visual. */
  fill: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    borderRadius: theme.radius.full,
  },
  label: {
    ...theme.typography.buttonLabelM, // Manrope Bold 16/22
    textAlign: 'center',
  },

  // ── sizes (on the Pressable) ───────────────────────────────────────────────
  // 52h full-width types: the design draws them 353 wide, i.e. 393 − 20px page
  // padding on both sides, so stretching inside a 20px-padded page matches.
  primary: { height: 52, alignSelf: 'stretch' },
  secondary: { height: 52, alignSelf: 'stretch' },
  premium: { height: 52, alignSelf: 'stretch' },
  small: { height: 36, minWidth: 72 },
  text: { height: 40 },
  destructive: { height: 40 },

  // ── horizontal padding (on the fill, so gradients cover it) ────────────────
  primaryPadding: {},
  secondaryPadding: {},
  premiumPadding: {},
  smallPadding: { paddingHorizontal: theme.spacing.l },
  textPadding: { paddingHorizontal: theme.spacing.s },
  destructivePadding: { paddingHorizontal: theme.spacing.s },

  // ── primary ────────────────────────────────────────────────────────────────
  primaryDefault: { borderWidth: 2, borderColor: palette.primary[50] },
  primaryPressed: {},
  primaryDisabled: { backgroundColor: theme.surface.disabled },

  // ── secondary ──────────────────────────────────────────────────────────────
  secondaryDefault: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.brand,
  },
  secondaryPressed: {
    backgroundColor: palette.primary[50],
    borderWidth: 1,
    borderColor: theme.border.brand,
  },
  secondaryDisabled: {
    backgroundColor: theme.surface.disabled,
    borderWidth: 1,
    borderColor: theme.border.disabled,
  },

  // ── premium ────────────────────────────────────────────────────────────────
  premiumDefault: { borderWidth: 2, borderColor: palette.accent[50] },
  premiumPressed: {},
  premiumDisabled: { backgroundColor: theme.surface.disabled },

  // ── small ──────────────────────────────────────────────────────────────────
  smallDefault: { borderWidth: 2, borderColor: palette.primary[50] },
  smallPressed: {},
  smallDisabled: { backgroundColor: theme.surface.disabled },

  // ── text / destructive (no fill in any state) ──────────────────────────────
  textDefault: {},
  textPressed: {},
  textDisabled: {},
  destructiveDefault: {},
  destructivePressed: {},
  destructiveDisabled: {},
});
