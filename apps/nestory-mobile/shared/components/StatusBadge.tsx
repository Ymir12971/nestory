import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/shared/theme';

/**
 * DS StatusBadge — Figma `Design System · 02 Atoms · StatusBadge` (48:699).
 *
 * px 12 / py 4, full pill radius, Tag&Badge label (Inter Medium 14/16); each
 * type pairs a *-subtle surface with its matching text colour.
 */
export type StatusBadgeType = 'inactive' | 'active' | 'warning' | 'error' | 'premium';

export function StatusBadge({ type = 'inactive', label }: { type?: StatusBadgeType; label: string }) {
  return (
    <View style={[s.base, s[type]]}>
      <Text style={[s.label, s[`${type}Label` as const]]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.m, // 12
    paddingVertical: theme.spacing.xs, // 4
    borderRadius: theme.radius.full,
  },
  label: { ...theme.typography.tagBadge },

  inactive: { backgroundColor: theme.surface.muted },
  inactiveLabel: { color: theme.text.disabled },

  active: { backgroundColor: theme.surface.successSubtle },
  activeLabel: { color: theme.text.success },

  warning: { backgroundColor: theme.surface.warningSubtle },
  warningLabel: { color: theme.text.warning },

  error: { backgroundColor: theme.surface.errorSubtle },
  errorLabel: { color: theme.text.error },

  premium: { backgroundColor: theme.surface.premiumSubtle },
  premiumLabel: { color: theme.text.premium },
});
