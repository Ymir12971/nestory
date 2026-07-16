import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useLocalSearchParams } from 'expo-router';
import { theme, palette } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

// global-Welcome to premium (Figma 771:3311). Shown after ANY successful
// subscribe or renew — first time or not — then "I'm all set" returns the user
// to wherever they started the purchase (annotation: 回到原位置).

const BENEFITS = [
  'Unlimited child profiles',
  'Unlimited monthly Stories',
  'Watermark-Free Sharing',
  'Access to regenerate past Stories',
  'Annual Recap and more features',
];

function nextBillingLabel(cycle: 'year' | 'month'): string {
  const d = new Date();
  if (cycle === 'year') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function WelcomeToPremiumScreen() {
  const goBack = useGoBack();
  const { cycle: cycleParam } = useLocalSearchParams<{ cycle?: string }>();
  const cycle: 'year' | 'month' = cycleParam === 'month' ? 'month' : 'year';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Welcome to Premium!</Text>

        {/* Hero */}
        <LinearGradient
          colors={[palette.accent[500], palette.accent[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <RemixIcon name="vip-crown-2-fill" size={32} color={theme.text.onColor} />
          <Text style={styles.heroLabel}>Premium Plan</Text>
        </LinearGradient>

        {/* Plan details */}
        <View style={styles.detailsCard}>
          <DetailRow label="Plan" value={cycle === 'year' ? 'Yearly' : 'Monthly'} />
          <DetailRow label="Price" value={cycle === 'year' ? '$100 / year' : '$10 / month'} />
          <DetailRow label="Next billing" value={nextBillingLabel(cycle)} />
          <Text style={styles.autoRenew}>Auto-renews until canceled. Manage in Settings.</Text>
        </View>

        {/* What's included */}
        <View style={styles.includedCard}>
          <Text style={styles.includedTitle}>What's included</Text>
          {BENEFITS.map(text => (
            <View key={text} style={styles.benefit}>
              <RemixIcon name="vip-crown-2-line" size={16} color={theme.text.premium} />
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.ctaBtnWrap, pressed && { opacity: 0.88 }]}
          onPress={goBack}
        >
          <LinearGradient
            colors={[palette.accent[500], palette.accent[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnLabel}>I'm all set</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.l,
  },

  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 38,
    color: theme.text.primary,
    paddingTop: theme.spacing.m,
  },

  hero: {
    borderRadius: theme.radius.l,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  heroLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    lineHeight: 34,
    color: theme.text.onColor,
  },

  detailsCard: {
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.card,
    padding: theme.spacing.l,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  detailValue: {
    ...theme.typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: theme.text.primary,
  },
  autoRenew: {
    ...theme.typography.caption,
    color: theme.text.hint,
  },

  includedCard: {
    borderRadius: theme.radius.l,
    backgroundColor: palette.accent[50],
    padding: theme.spacing.l,
    gap: 12,
  },
  includedTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: theme.text.primary,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.text.primary,
  },

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
  ctaBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.premium,
  },
});
