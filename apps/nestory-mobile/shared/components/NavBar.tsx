import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

/**
 * DS NavBar — Figma `Design System · 03 Molecules · NavBar` (48:760).
 *
 * The four designed types are the same 56px row with different slots filled:
 *
 *   Back&Title             back + title, empty 24px right slot
 *   full                   back + title, share icon on the right
 *   withButton             back + title, DS Small button on the right
 *   BackOnlyforOnboarding  back + invisible title + right slot, plus a
 *                          segmented progress bar underneath
 *
 * Geometry that differs from what the screens hand-rolled before:
 *   • horizontal padding is `spacing/xl-20`, not xxl-24
 *   • the title sits 16px to the right of the back arrow — left-aligned, not
 *     centred between arrow and spacer
 */
type Props = {
  title?: string;
  /** Defaults to the app's standard back behaviour. Pass `null` for no arrow. */
  onBack?: (() => void) | null;
  /** Right-hand slot: share icon, DS Small button, … Reserves 24px when empty. */
  right?: ReactNode;
  /** Onboarding keeps the title in the layout but invisible (48:754). */
  hideTitle?: boolean;
  /** Segmented progress bar rendered below the row. */
  progress?: { total: number; active: number };
};

export function NavBar({ title, onBack, right, hideTitle, progress }: Props) {
  const goBack = useGoBack();
  const back = onBack === null ? null : (onBack ?? goBack);

  return (
    <View>
      <View style={s.row}>
        <View style={s.left}>
          {back ? (
            <Pressable hitSlop={8} onPress={back} accessibilityRole="button" accessibilityLabel="Back">
              <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
            </Pressable>
          ) : (
            <View style={s.slot} />
          )}
          {title && (
            <Text style={[s.title, hideTitle && s.titleHidden]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
        {right ?? <View style={s.slot} />}
      </View>

      {progress && (
        <View style={s.progressWrap}>
          <View style={s.progress}>
            {Array.from({ length: progress.total }).map((_, i) => (
              <View key={i} style={[s.segment, i < progress.active && s.segmentActive]} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl, // 20
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.l, // 16
  },
  slot: { width: 24, height: 24 },
  title: {
    ...theme.typography.h2, // Manrope Bold 18/24
    color: theme.text.primary,
    flexShrink: 1,
  },
  titleHidden: { opacity: 0 },

  progressWrap: { paddingHorizontal: theme.spacing.xxl }, // 24
  progress: {
    flexDirection: 'row',
    gap: 6,
    height: 4,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minWidth: 1,
    height: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.border.default,
  },
  segmentActive: { backgroundColor: theme.surface.brand },
});
