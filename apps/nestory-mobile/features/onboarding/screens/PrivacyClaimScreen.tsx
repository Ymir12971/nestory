import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { palette, theme } from '@/shared/theme';

// O-Privacy claim (Figma 752:1639) — static promise page shown right after a
// successful sign-in, before we ask anything about the child. Single CTA.
//
// Each promise is a plain icon + text row (24px icon, gap 4, list gap 24) — no
// cards, no icon chips. The bold lead-in sits in the same text flow as the body
// copy, in brand green.
//
// Every line here must stay true of the code (2026-11-03 review): photos sit in
// a public bucket and staff may review Stories, so no "confidential"; the
// Story prompt gets the child's first name, age and Moment text (storyAi.ts,
// storyGen/prompt1.ts) but never photos; data goes to service providers, so
// "never sold", not "never shared". Change the Termly privacy policy with it.
const PROMISES: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: 'lock-2-line',
    title: 'Private to you.',
    body: 'Your Moments are encrypted in transit and at rest. A Story only goes public when you share its link, and you can delete anything, anytime.',
  },
  {
    icon: 'error-warning-line',
    title: 'Never used to train AI.',
    body: "AI reads your notes, plus your child's first name and age, to write each monthly Story. Photos are never sent to AI, and nothing is used to train models.",
  },
  {
    icon: 'price-tag-3-line',
    title: 'Never sold.',
    body: "We never sell your data or use it for ads. It's only handled by the services that run Nestory.",
  },
];

export function PrivacyClaimScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* title 752:1642 */}
      <View style={styles.title}>
        <Text style={styles.heading}>
          <Text style={styles.headingBrand}>Privacy </Text>
          is our top priority
        </Text>
        <Text style={styles.subheading}>
          We're about to ask a few things about your child. Here's our promise before you share
          anything.
        </Text>
      </View>

      {/* body 752:1721 */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroTile}>
            <RemixIcon name="shield-check-line" size={72} color={palette.primary[500]} />
          </View>
        </View>

        <View style={styles.promises}>
          {PROMISES.map((p) => (
            <View key={p.title} style={styles.promiseRow}>
              <RemixIcon name={p.icon as any} size={24} color={palette.primary[500]} />
              <Text style={styles.promiseBody}>
                <Text style={styles.promiseTitle}>{p.title}</Text>
                {'\n'}
                {p.body}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* cta 752:1663 */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, theme.spacing.safeBtm) }]}>
        <Button
          label="I understand. Let's start"
          onPress={() => router.replace('/onboarding/profile')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },

  title: {
    paddingHorizontal: theme.spacing.xl, // 20
    paddingVertical: theme.spacing.l, // 16
    gap: 6,
  },
  heading: { ...theme.typography.h1, color: theme.text.primary },
  headingBrand: { color: theme.text.brand },
  subheading: { ...theme.typography.body, color: theme.text.secondary },

  scroll: { flex: 1 },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
    gap: theme.spacing.xxl, // 24
  },

  heroWrap: { alignItems: 'center', gap: theme.spacing.s },
  heroTile: {
    width: 128,
    height: 128,
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  promises: { gap: theme.spacing.xxl }, // 24
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs, // 4
  },
  promiseTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: theme.text.brand,
  },
  promiseBody: {
    ...theme.typography.body, // Inter Regular 16/20
    color: theme.text.secondary,
    flex: 1,
  },

  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l, // 16
  },
});
