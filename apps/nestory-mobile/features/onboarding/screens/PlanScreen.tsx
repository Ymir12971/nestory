import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showToast } from '@/features/ui/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { NavBar } from '@/shared/components/NavBar';
import { theme, palette } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { queryClient, queryKeys } from '@/api';
import { purchasePlan, isPurchasesAvailable } from '@/features/billing/purchases';
import { useChildren } from '@/api';
import { track } from '@/shared/lib/analytics';

// O-Choose plan (Figma 739:1406 yearly / 758:1219 monthly). No trial — the
// product has no free-trial concept (Handoff §3.1); CTA is a straight purchase.
// Success → global Welcome-to-Premium page, then on to Home.

type Plan = 'yearly' | 'monthly';

const PREMIUM_BENEFITS = [
  'Unlimited child profiles',
  'Unlimited monthly Stories',
  'Watermark-Free Sharing',
  'Access to regenerate past Stories',
  'Annual Recap and more features',
];

const FREE_ITEMS = ['One child profile', 'Two Stories', 'Watermarked Sharing'];

export function PlanScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const childrenQ = useChildren();
  // `?plan=monthly` starts on the monthly card (758:1219). Dev-only.
  const { plan: planParam } = useLocalSearchParams<{ plan?: string }>();
  const [plan, setPlan] = useState<Plan>(
    __DEV__ && planParam === 'monthly' ? 'monthly' : 'yearly',
  );
  const [purchasing, setPurchasing] = useState(false);

  const profileCount = childrenQ.data?.length ?? 0;

  const handleSubscribe = async () => {
    const cycle = plan === 'yearly' ? 'year' : 'month';
    // On web / dev (no RC key) skip the store and land on the welcome page.
    if (!isPurchasesAvailable()) {
      track('onboarding_complete', { profileCount, plan: 'premium' });
      router.replace(`/welcome-premium?cycle=${cycle}&from=onboarding`);
      return;
    }
    setPurchasing(true);
    try {
      const res = await purchasePlan(plan);
      if (res.status === 'purchased') {
        // Webhook updates the backend async; refresh so the app reflects premium.
        await queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
        track('subscribe_success', { cycle: plan, source: 'onboarding' });
        track('onboarding_complete', { profileCount, plan: 'premium' });
        router.replace(`/welcome-premium?cycle=${cycle}&from=onboarding`);
      }
      // 'cancelled' → stay on screen, let the user choose again.
    } catch (e) {
      // Payment failure → toast, stay here (annotation: 支付失败 toast 提示).
      const msg = e instanceof Error ? e.message : 'Please try again.';
      showToast({ type: 'error', message: `Purchase failed: ${msg}` });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Final onboarding phase — all three progress segments filled (739:1408) */}
      <NavBar onBack={goBack} progress={{ total: 3, active: 3 }} />

      {/* title 739:1409 — headline only, no subtitle */}
      <View style={styles.title}>
        <Text style={styles.headline}>Choose your plan</Text>
      </View>

      {/* body 755:3033 */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium card 755:2902: crown + benefits + plan picker */}
        <View style={styles.premiumCard}>
          <View style={styles.cardHeader}>
            <RemixIcon name="vip-crown-2-line" size={24} color={theme.text.premium} />
            <Text style={styles.premiumTitle}>Premium</Text>
          </View>

          <View style={styles.benefits}>
            {PREMIUM_BENEFITS.map((text) => (
              <View key={text} style={styles.benefitRow}>
                <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.planRow}>
            <Pressable
              style={[styles.planCard, plan === 'yearly' ? styles.planSelected : styles.planUnselected]}
              onPress={() => setPlan('yearly')}
            >
              <View style={styles.planTop}>
                <Text style={styles.planPrice}>$100</Text>
                <RemixIcon
                  name={plan === 'yearly' ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'}
                  size={20}
                  color={plan === 'yearly' ? theme.border.premium : theme.border.strong}
                />
              </View>
              <View style={styles.planMeta}>
                <Text style={styles.planCaption}>Billed annually</Text>
                <Text style={styles.planBadge}>~17% Off</Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.planCard,
                styles.planCardMonthly,
                plan === 'monthly' ? styles.planSelected : styles.planUnselected,
              ]}
              onPress={() => setPlan('monthly')}
            >
              <View style={styles.planTop}>
                <Text style={styles.planPrice}>$10</Text>
                <RemixIcon
                  name={plan === 'monthly' ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'}
                  size={20}
                  color={plan === 'monthly' ? theme.border.premium : theme.border.strong}
                />
              </View>
              <Text style={styles.planCaption}>Billed monthly</Text>
            </Pressable>
          </View>
        </View>

        {/* Free card 755:2903 */}
        <View style={styles.freeCard}>
          <View style={styles.cardHeader}>
            <RemixIcon name="layout-left-2-line" size={24} color={palette.neutral.black} />
            <Text style={styles.freeTitle}>Free</Text>
          </View>
          <View style={styles.benefits}>
            {FREE_ITEMS.map((text) => (
              <View key={text} style={styles.benefitRow}>
                <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.secondary} />
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* cta 761:2473 — the legal line lives in this block, 12 below the buttons */}
      <View style={styles.cta}>
        <Button
          label={purchasing ? 'Processing…' : 'Start with Premium'}
          type="premium"
          disabled={purchasing}
          onPress={handleSubscribe}
        />
        <Button
          label="Start with Free"
          type="text"
          style={styles.freeButton}
          onPress={() => {
            track('onboarding_complete', { profileCount, plan: 'free' });
            router.replace('/');
          }}
        />
        <Text style={styles.footerText}>
          Auto-renews until canceled. Manage in Settings.{'\n'}
          <Text style={styles.footerLink} onPress={() => router.push('/onboarding/terms')}>
            Terms of Service
          </Text>
          <Text style={styles.footerLinkPlain}>{' · '}</Text>
          <Text style={styles.footerLink} onPress={() => router.push('/onboarding/privacy')}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },
  title: {
    paddingHorizontal: theme.spacing.xl, // 20
    paddingVertical: theme.spacing.l, // 16
  },
  headline: {
    ...theme.typography.h1,
    color: theme.text.primary,
  },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.l, // 16
  },

  // Premium card 755:2902 — radius/m, px16 py12, border/strong (not premium)
  premiumCard: {
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.m,
    backgroundColor: theme.surface.premiumSubtle,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs, // 4
  },
  premiumTitle: {
    ...theme.typography.h2, // Manrope Bold 18/24
    color: theme.text.premium,
  },
  benefits: { gap: theme.spacing.s }, // 8
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs, // 4
  },
  benefitText: { flex: 1, ...theme.typography.body, color: theme.text.primary },

  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.s, // 8
  },
  planCard: {
    flex: 1,
    borderRadius: theme.radius.m,
    backgroundColor: theme.surface.card,
    paddingHorizontal: theme.spacing.l, // 16
    paddingVertical: 14,
    gap: theme.spacing.s, // 8
  },
  planCardMonthly: { height: 94 }, // 756:3237 is pinned so both cards align
  planSelected: {
    borderWidth: 2,
    borderColor: theme.border.premium, // #f59e0b
  },
  planUnselected: {
    borderWidth: 1,
    borderColor: theme.border.strong,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planPrice: {
    ...theme.typography.h3, // Manrope SemiBold 16/22
    color: theme.text.primary,
  },
  planMeta: { gap: theme.spacing.xs },
  planCaption: { ...theme.typography.caption, color: theme.text.secondary },
  planBadge: {
    ...theme.typography.h4, // Manrope SemiBold 14/20
    color: theme.text.premium,
  },

  // Free card 755:2903
  freeCard: {
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.m,
    backgroundColor: theme.surface.card,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    gap: 12,
  },
  freeTitle: {
    ...theme.typography.h2,
    color: palette.neutral.black,
  },

  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.s, // 8
    gap: 12,
    alignItems: 'center',
  },
  freeButton: { height: 44 },
  // 761:2476 — legal line sits inside the CTA block; links are underlined and
  // brand-coloured, the sentence above them is text/secondary
  footerText: {
    ...theme.typography.caption, // Inter Regular 14/16
    color: theme.text.secondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.safeBtm,
  },
  footerLink: {
    color: theme.text.brand,
    textDecorationLine: 'underline',
  },
  footerLinkPlain: { color: theme.text.brand },
});
