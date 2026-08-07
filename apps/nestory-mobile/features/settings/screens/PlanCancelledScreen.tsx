import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { theme } from '@/shared/theme';
import { useSubscription } from '@/api';

// ST-Plan cancelled (Figma 771:3205). Shown once the platform cancellation has
// actually landed (RevenueCat webhook flips the status) — 方案A: the app never
// pretends an in-app cancel completed. Not auto-navigated yet; routable at
// /settings/plan-cancelled for when status-change detection lands (WorkPlan §6).
//
// Left-aligned title over a two-paragraph note, then the "still yours until
// then" benefit card — not a centred success screen with a check badge.
const BENEFITS = [
  'Unlimited child profiles',
  'Unlimited monthly Stories',
  'Watermark-Free Sharing',
  'Access to regenerate past Stories',
  'Annual Recap and more features',
];

function formatCycleEnd(iso: string | null): string {
  if (!iso) return 'the end of your billing cycle';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PlanCancelledScreen() {
  const router = useRouter();
  const subQ = useSubscription();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* title 771:3286 */}
      <View style={styles.title}>
        <Text style={styles.titleText}>Premium has been cancelled</Text>
      </View>

      {/* body 771:3208 */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <Text style={styles.note}>
          We are sorry to see you go.{'\n'}
          {'\n'}
          You won't be charged again. Your plan stays Premium through the end of this billing cycle:{' '}
          {formatCycleEnd(subQ.data?.expiresAt ?? null)}.
        </Text>

        <View style={styles.includedCard}>
          <Text style={styles.includedTitle}>STILL YOURS UNTIL THEN</Text>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* buttonBlock 771:3304 */}
      <View style={styles.cta}>
        <Button label="Back to Settings" onPress={() => router.replace('/settings')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },

  title: {
    paddingHorizontal: 20,
    paddingVertical: theme.spacing.l,
  },
  titleText: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.primary,
  },

  scroll: { flex: 1 },
  body: {
    padding: theme.spacing.xl, // 20
    gap: theme.spacing.l, // 16
  },
  note: {
    ...theme.typography.body,
    color: theme.text.primary,
  },

  includedCard: {
    backgroundColor: theme.surface.premiumSubtle,
    borderWidth: 1,
    borderColor: theme.border.default, // neutral/200
    borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.xl, // 20
    gap: 14,
  },
  includedTitle: {
    ...theme.typography.h2, // Manrope Bold 18/24
    color: theme.text.primary,
  },
  benefitRow: {
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
    paddingHorizontal: 20,
    paddingTop: theme.spacing.xs, // 4
    paddingBottom: theme.spacing.safeBtm,
  },
});
