import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { PremiumCrown } from '@/shared/components/PremiumCrown';
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
  const router = useRouter();
  const { cycle: cycleParam, from } = useLocalSearchParams<{ cycle?: string; from?: string }>();
  const cycle: 'year' | 'month' = cycleParam === 'month' ? 'month' : 'year';
  // From onboarding the flow continues into Home; everywhere else "I'm all set"
  // returns to wherever the purchase started (annotation: 回到原位置).
  const onAllSet = from === 'onboarding' ? () => router.replace('/') : goBack;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* title 771:3313 */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Welcome to Premium!</Text>
      </View>

      {/* body 771:3316 */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* currentPlanCard 771:3317 — 160.79° accent/400 → accent/500 with three
            deeper-amber blobs bleeding off the corners */}
        <LinearGradient
          colors={[palette.accent[400], palette.accent[500]]}
          locations={[0, 0.7071]}
          start={{ x: 0.336, y: 0.028 }}
          end={{ x: 0.664, y: 0.972 }}
          style={styles.hero}
        >
          <View style={[styles.blob, styles.blobTopLeft]} />
          <View style={[styles.blob, styles.blobRight]} />
          <View style={[styles.blob, styles.blobTopRight]} />
          <PremiumCrown size={41} color={theme.text.onColor} />
          <Text style={styles.heroLabel}>Premium Plan</Text>
        </LinearGradient>

        {/* billingDetailCard 771:3324 */}
        <View style={styles.detailsCard}>
          <DetailRow label="Plan" value={cycle === 'year' ? 'Yearly' : 'Monthly'} />
          <DetailRow label="Price" value={cycle === 'year' ? '$100 / year' : '$10 / month'} />
          <DetailRow label="Next billing" value={nextBillingLabel(cycle)} />
          <Text style={styles.autoRenew}>Auto-renews until canceled. Manage in Settings.</Text>
        </View>

        {/* includedCard 771:3335 */}
        <View style={styles.includedCard}>
          <Text style={styles.includedTitle}>What's included</Text>
          {BENEFITS.map((text) => (
            <View key={text} style={styles.benefit}>
              <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* cta 771:3357 */}
      <View style={styles.cta}>
        <Button label="I'm all set" type="premium" onPress={onAllSet} />
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
    padding: theme.spacing.xl, // 20
    gap: theme.spacing.l, // 16
  },

  titleBlock: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
  },
  title: { ...theme.typography.h1, color: theme.text.primary },

  hero: {
    borderRadius: theme.radius.l,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.l, // 16
    paddingVertical: theme.spacing.xl, // 20
    gap: theme.spacing.xs, // 4
    overflow: 'hidden',
  },
  heroLabel: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.onColor,
    textAlign: 'center',
  },
  blob: { position: 'absolute', borderRadius: theme.radius.full },
  blobTopLeft: { left: -42, top: -49, width: 140, height: 140, backgroundColor: '#f8aa14' },
  blobRight: { left: 285, top: 82, width: 63, height: 63, backgroundColor: '#f9b21a' },
  blobTopRight: { left: 255, top: -11, width: 36, height: 36, backgroundColor: '#f9b21a' },

  detailsCard: {
    borderWidth: 1,
    borderColor: theme.border.default, // neutral/200
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.card,
    padding: theme.spacing.l,
    gap: 12,
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
    ...theme.typography.h3, // Manrope SemiBold 16/22
    color: theme.text.primary,
  },
  autoRenew: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },

  includedCard: {
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.premiumSubtle,
    paddingHorizontal: theme.spacing.l, // 16
    paddingVertical: theme.spacing.xl, // 20
    gap: 14,
  },
  includedTitle: {
    ...theme.typography.h2, // Manrope Bold 18/24
    color: theme.text.primary,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs, // 4
  },
  benefitText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.text.primary,
  },

  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.s, // 8
    paddingBottom: theme.spacing.safeBtm,
  },
});
