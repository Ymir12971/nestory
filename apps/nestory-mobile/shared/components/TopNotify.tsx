import { Pressable, StyleSheet, Text, View } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { theme } from '@/shared/theme';

// Re-export from @nestory/types so existing imports continue to work
export type { TopNotifyStatus, TopNotifyKind } from '@nestory/types';
import type { TopNotifyStatus } from '@nestory/types';

function getMessage(
  type: TopNotifyStatus,
  kind: 'trial' | 'premium',
): string {
  const K = kind === 'trial' ? 'Trial' : 'Premium';
  switch (type) {
    case 'stories_trial_ended':
      return 'Trial ended — your Stories will pause next month. Upgrade to keep them going. →';
    case 'stories_premium_ended':
      return 'Premium ended — your Stories will pause next month. Upgrade to keep them going. →';
    case 'hl_free_at_limit':
      return '10 / 10 Highlights used. Upgrade for unlimited. →';
    case 'hl_ended_under_limit':
      return `${K} ended — new Highlights capped at 10. Upgrade for unlimited. →`;
    case 'hl_ended_at_limit':
      return `${K} ended — you've reached the Free limit of 10. Upgrade to add more. →`;
    case 'hl_ended_over_limit':
      return `${K} ended — your existing Highlights are safe. New ones are capped at 10. Upgrade for unlimited. →`;
  }
}

export function TopNotify({
  type,
  kind = 'premium',
  onPress,
}: {
  type: TopNotifyStatus;
  kind?: 'trial' | 'premium';
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.wrap}>
      <RemixIcon name="error-warning-line" size={16} color={theme.text.warning} />
      <Text style={styles.text}>{getMessage(type, kind)}</Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{inner}</Pressable>;
  }
  return inner;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.surface.warningSubtle,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
    gap: 4,
  },
  text: {
    flex: 1,
    ...theme.typography.tagBadge,
    color: theme.text.warning,
  },
});
