import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';

// O-Privacy claim (Figma 752:1639) — static promise page shown right after a
// successful sign-in, before we ask anything about the child. Single CTA.

const PROMISES: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: 'lock-2-line',
    title: 'Kept strictly confidential.',
    body: 'Everything you enter is encrypted and belongs to you.',
  },
  {
    icon: 'shield-check-line',
    title: 'Never used to train AI.',
    body: "Your child's data will never feed any model.",
  },
  {
    icon: 'hand-heart-line',
    title: 'Never sold or shared.',
    body: 'We follow the data-protection laws in your region and never sell the data to any other third-parties.',
  },
];

export function PrivacyClaimScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingGroup}>
          <Text style={styles.heading}>Privacy is of the top importance here</Text>
          <Text style={styles.subheading}>
            We're about to ask a few things about your child. Here's our promise before you share anything.
          </Text>
        </View>

        <View style={styles.promises}>
          {PROMISES.map(p => (
            <View key={p.title} style={styles.promiseCard}>
              <View style={styles.promiseIcon}>
                <RemixIcon name={p.icon as any} size={22} color={theme.text.brand} />
              </View>
              <View style={styles.promiseText}>
                <Text style={styles.promiseTitle}>{p.title}</Text>
                <Text style={styles.promiseBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.ctaBtnWrap, pressed && { opacity: 0.85 }]}
          onPress={() => router.replace('/onboarding/profile')}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnLabel}>I understand. Let's start</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 48,
    gap: theme.spacing.xxl,
  },

  headingGroup: { gap: 10 },
  heading: { ...theme.typography.h1, color: theme.text.primary },
  subheading: { ...theme.typography.body, color: theme.text.secondary },

  promises: { gap: theme.spacing.m },
  promiseCard: {
    flexDirection: 'row',
    gap: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.card,
    padding: theme.spacing.l,
  },
  promiseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: { flex: 1, gap: 4 },
  promiseTitle: { ...theme.typography.h4, color: theme.text.primary },
  promiseBody: { ...theme.typography.body, color: theme.text.secondary },

  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
  },
  ctaBtnWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  ctaBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaBtnLabel: { ...theme.typography.buttonLabelM, color: theme.text.onColor },
});
