import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showToast } from '@/features/ui/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { queryClient, queryKeys } from '@/api';
import { purchasePlan, isPurchasesAvailable } from '@/features/billing/purchases';
import { useChildren } from '@/api';
import { track } from '@/shared/lib/analytics';

// O-Choose plan (Figma 739:1406 yearly / 758:1219 monthly). No trial — the
// product has no free-trial concept (Handoff §3.1); CTA is a straight purchase.
// Success → global Welcome-to-Premium page, then on to Home.

const TOTAL_STEPS = 5;
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
  const [plan, setPlan] = useState<Plan>('yearly');
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
      {/* NavBar */}
      <View style={styles.navBar}>
        <View style={styles.navRow}>
          <Pressable onPress={goBack} hitSlop={8}>
            <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
          </Pressable>
        </View>
        <View style={styles.progress}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressSegment, styles.progressActive]} />
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Choose your plan</Text>

        {/* Premium card: crown + benefits + plan picker */}
        <View style={styles.premiumCard}>
          <View style={styles.premiumHeader}>
            <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
            <Text style={styles.premiumTitle}>Premium</Text>
          </View>

          <View style={styles.benefits}>
            {PREMIUM_BENEFITS.map(text => (
              <View key={text} style={styles.benefitRow}>
                <Text style={styles.benefitBullet}>•</Text>
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
                {plan === 'yearly' ? (
                  <View style={styles.radioChecked}>
                    <RemixIcon name="check-line" size={12} color={theme.text.onColor} />
                  </View>
                ) : (
                  <View style={styles.radioUnchecked} />
                )}
              </View>
              <Text style={styles.planCaption}>Billed annually</Text>
              <Text style={styles.planBadge}>~17% Off</Text>
            </Pressable>

            <Pressable
              style={[styles.planCard, plan === 'monthly' ? styles.planSelected : styles.planUnselected]}
              onPress={() => setPlan('monthly')}
            >
              <View style={styles.planTop}>
                <Text style={styles.planPrice}>$10</Text>
                {plan === 'monthly' ? (
                  <View style={styles.radioChecked}>
                    <RemixIcon name="check-line" size={12} color={theme.text.onColor} />
                  </View>
                ) : (
                  <View style={styles.radioUnchecked} />
                )}
              </View>
              <Text style={styles.planCaption}>Billed monthly</Text>
            </Pressable>
          </View>
        </View>

        {/* Free card */}
        <View style={styles.freeCard}>
          <Text style={styles.freeTitle}>Free</Text>
          <View style={styles.benefits}>
            {FREE_ITEMS.map(text => (
              <View key={text} style={styles.benefitRow}>
                <Text style={styles.benefitBullet}>•</Text>
                <Text style={styles.freeItemText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* CTAs */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.premiumWrap, (pressed || purchasing) && { opacity: 0.85 }]}
          onPress={handleSubscribe}
          disabled={purchasing}
        >
          <LinearGradient
            colors={[palette.accent[500], palette.accent[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumButton}
          >
            <Text style={styles.premiumLabel}>
              {purchasing ? 'Processing…' : 'Start with Premium'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.freeButton, pressed && { opacity: 0.85 }]}
          onPress={() => {
            track('onboarding_complete', { profileCount, plan: 'free' });
            router.replace('/');
          }}
        >
          <Text style={styles.freeLabel}>Start with Free</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Auto-renews until canceled. Manage in Settings.{' '}
          <Text style={styles.footerLink} onPress={() => router.push('/onboarding/terms')}>
            Terms of Service
          </Text>
          {' · '}
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
  navBar: {
    paddingHorizontal: theme.spacing.xxl,
  },
  navRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    height: 4,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.border.default,
  },
  progressActive: {
    backgroundColor: theme.surface.brand,
  },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: theme.spacing.l,
  },
  headline: {
    ...theme.typography.h1,
    color: theme.text.primary,
  },

  // Premium card
  premiumCard: {
    borderWidth: 1,
    borderColor: theme.text.premium,
    borderRadius: theme.radius.l,
    backgroundColor: palette.accent[50],
    padding: theme.spacing.l,
    gap: 12,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: theme.text.premium,
  },
  benefits: { gap: 8 },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  benefitBullet: { ...theme.typography.body, color: theme.text.primary },
  benefitText: { flex: 1, ...theme.typography.body, color: theme.text.primary },

  planRow: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    borderRadius: theme.radius.m,
    backgroundColor: theme.surface.card,
    padding: theme.spacing.m,
    gap: 2,
  },
  planSelected: {
    borderWidth: 2,
    borderColor: theme.text.premium,
  },
  planUnselected: {
    borderWidth: 1,
    borderColor: theme.border.default,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planPrice: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    lineHeight: 30,
    color: theme.text.primary,
  },
  radioChecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.text.premium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border.strong,
  },
  planCaption: { ...theme.typography.caption, color: theme.text.secondary },
  planBadge: { ...theme.typography.caption, color: theme.text.premium },

  // Free card
  freeCard: {
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.card,
    padding: theme.spacing.l,
    gap: 12,
  },
  freeTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: theme.text.primary,
  },
  freeItemText: { flex: 1, ...theme.typography.body, color: theme.text.secondary },

  cta: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  premiumWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.surface.premiumSubtle,
  },
  premiumButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.premium,
  },
  freeButton: {
    height: 52,
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.brand,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: theme.spacing.safeBtm,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },
  footerLink: {
    fontFamily: 'Manrope_600SemiBold',
    color: theme.text.brand,
  },
});
