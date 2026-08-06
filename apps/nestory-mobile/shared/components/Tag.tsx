import { type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  type StyleProp,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { theme } from '@/shared/theme';

/**
 * DS Tag — Figma `Design System · 02 Atoms · Tag` (48:698).
 *
 *   Selected    surface/brand fill, white label
 *   Unselected  surface/brand-subtle fill + 1px border/default, primary label
 *   Disabled    surface/disabled fill + 1px border/disabled, disabled label
 *
 * Shared geometry: px 12 / py 6, gap 4, full pill radius, Tag&Badge label
 * (Inter Medium 14/16).
 */
export type TagStatus = 'selected' | 'unselected' | 'disabled';

type Props = Omit<PressableProps, 'style' | 'children' | 'disabled'> & {
  label: string;
  status?: TagStatus;
  icon?: ReactNode;
  /** Some screens instance a roomier tag (px 16 / py 8 with a Body label). */
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function Tag({ label, status = 'unselected', icon, style, labelStyle, ...rest }: Props) {
  const body = (
    <View style={[s.base, s[status], style]}>
      {icon}
      <Text style={[s.label, s[`${status}Label` as const], labelStyle]}>{label}</Text>
    </View>
  );

  if (!rest.onPress || status === 'disabled') return body;
  return (
    <Pressable accessibilityRole="button" {...rest}>
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs, // 4
    paddingHorizontal: theme.spacing.m, // 12
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  label: { ...theme.typography.tagBadge }, // Inter Medium 14/16

  selected: { backgroundColor: theme.surface.brand },
  selectedLabel: { color: theme.text.onColor },

  unselected: {
    backgroundColor: theme.surface.brandSubtle,
    borderWidth: 1,
    borderColor: theme.border.default,
  },
  unselectedLabel: { color: theme.text.primary },

  disabled: {
    backgroundColor: theme.surface.disabled,
    borderWidth: 1,
    borderColor: theme.border.disabled,
  },
  disabledLabel: { color: theme.text.disabled },
});
