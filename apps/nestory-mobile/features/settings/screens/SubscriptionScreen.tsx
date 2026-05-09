import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import type { Subscription } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { useSubscription } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';

// ---------- Types ----------

type PlanCycle = 'yearly' | 'monthly';

// ---------- Helpers ----------

function formatExpiry(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function freeSubtitle(sub: Subscription): string {
  if (sub.subscriptionStatus === 'trial_ended')   return 'Free trial ended';
  if (sub.subscriptionStatus === 'premium_ended') return 'Premium ended';
  const remaining = sub.storyQuotaRemaining;
  if (remaining == null) return '';
  return `${remaining} ${remaining === 1 ? 'Story' : 'Stories'} remaining`;
}

// ---------- Shared NavBar ----------

function NavBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.navBar}>
      <Pressable hitSlop={8} onPress={onBack}>
        <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
      </Pressable>
      <Text style={styles.navTitle}>Subscription</Text>
      <View style={styles.navSpacer} />
    </View>
  );
}

// ---------- ST-02A Free Plan ----------

function FreePlanContent({ sub, router }: { sub: Subscription; router: ReturnType<typeof useRouter> }) {
  const [cycle, setCycle] = useState<PlanCycle>('yearly');

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.bodyFree}
        showsVerticalScrollIndicator={false}
      >
        {/* Current plan card */}
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanPill}>
            <Text style={styles.currentPlanPillLabel}>CURRENT PLAN</Text>
          </View>
          <Text style={styles.currentPlanName}>Free Plan</Text>
          <Text style={styles.currentPlanSubtitle}>{freeSubtitle(sub)}</Text>
        </View>

        {/* Compare table */}
        <View style={styles.compareTable}>
          {/* Header */}
          <View style={[styles.compareRow, styles.compareHeader]}>
            <View style={styles.colFeature}><Text style={styles.compareHeaderText}>Feature</Text></View>
            <View style={styles.colPlan}><Text style={styles.compareHeaderText}>Free</Text></View>
            <View style={styles.colPlan}><Text style={[styles.compareHeaderText, { color: theme.text.premium }]}>Premium</Text></View>
          </View>
          {/* Rows */}
          {[
            { feature: 'AI Stories',             free: '2',  premium: 'Unlimited', premiumType: 'text' },
            { feature: 'Watermark-Free Sharing', free: null, premium: null,         premiumType: 'check' },
            { feature: 'Highlights',             free: '10', premium: 'Unlimited', premiumType: 'text' },
            { feature: 'Child Profiles',         free: '1',  premium: 'Unlimited', premiumType: 'text' },
          ].map((item, i) => (
            <View key={i} style={styles.compareRow}>
              <View style={styles.colFeature}>
                <Text style={styles.compareFeatureText}>{item.feature}</Text>
              </View>
              <View style={styles.colPlan}>
                {item.free !== null ? (
                  <Text style={styles.compareValueTextSecondary}>{item.free}</Text>
                ) : (
                  <RemixIcon name="close-line" size={20} color={theme.text.secondary} />
                )}
              </View>
              <View style={styles.colPlan}>
                {item.premiumType === 'text' ? (
                  <Text style={styles.compareValueTextPremium}>{item.premium}</Text>
                ) : (
                  <RemixIcon name="check-line" size={20} color={theme.text.brand} />
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.planSelectorRow}>
          {/* Yearly — flex:1 per Figma */}
          <Pressable
            style={[styles.planCard, styles.planCardYearly, cycle === 'yearly' ? styles.planCardSelected : styles.planCardUnselected]}
            onPress={() => setCycle('yearly')}
          >
            <View style={styles.planCardHeader}>
              <Text style={styles.planCardTitle}>Yearly</Text>
              <RemixIcon
                name={cycle === 'yearly' ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'}
                size={24}
                color={cycle === 'yearly' ? palette.accent[500] : theme.text.secondary}
              />
            </View>
            <View style={styles.planCardPriceRow}>
              <Text style={styles.planCardPrice}>$99.99/year</Text>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsBadgeLabel}>$20 Off</Text>
              </View>
            </View>
            <Text style={styles.planCardPromo}>First month free</Text>
          </Pressable>

          {/* Monthly — fixed w-156 per Figma */}
          <Pressable
            style={[styles.planCard, styles.planCardMonthly, cycle === 'monthly' ? styles.planCardSelected : styles.planCardUnselected]}
            onPress={() => setCycle('monthly')}
          >
            <View style={styles.planCardHeader}>
              <Text style={styles.planCardTitle}>Monthly</Text>
              <RemixIcon
                name={cycle === 'monthly' ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'}
                size={24}
                color={cycle === 'monthly' ? palette.accent[500] : theme.text.secondary}
              />
            </View>
            <Text style={styles.planCardPriceSecondary}>$9.99/month</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.premiumBtnWrap, pressed && { opacity: 0.85 }]}
          onPress={() => { /* TODO: initiate IAP purchase for selected cycle */ }}
        >
          <LinearGradient
            colors={[palette.accent[500], palette.accent[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumBtn}
          >
            <Text style={styles.premiumBtnLabel}>Try Premium Free for 1 Month</Text>
          </LinearGradient>
        </Pressable>
        <Text style={styles.ctaCaption}>Cancel anytime. Manage in Settings.</Text>
      </View>
    </>
  );
}

// ---------- ST-02B Premium Plan ----------

function PremiumPlanContent({ sub }: { sub: Subscription }) {
  const cycleLabel = sub.billingCycle === 'monthly' ? 'Monthly' : 'Yearly';
  const renewsLabel = sub.expiresAt
    ? `Renews ${formatExpiry(sub.expiresAt)}`
    : 'Renewal date pending';
  const billingRows: { key: string; value: string }[] = [
    { key: 'Plan', value: cycleLabel },
    ...(sub.expiresAt
      ? [{ key: 'Next billing', value: formatExpiry(sub.expiresAt) }]
      : []),
  ];
  const benefits = sub.benefits.length > 0
    ? sub.benefits
    : [
        'Unlimited AI Stories',
        'Watermark-free sharing',
        'Unlimited Highlights',
        'Unlimited child profiles',
      ];

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.bodyPremium}
        showsVerticalScrollIndicator={false}
      >
        {/* Current plan card — amber gradient */}
        <LinearGradient
          colors={[palette.accent[400], palette.accent[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={styles.premiumCurrentCard}
        >
          <RemixIcon name="vip-crown-fill" size={28} color={theme.text.onColor} />
          <View style={styles.premiumCurrentPill}>
            <Text style={styles.premiumCurrentPillLabel}>CURRENT PLAN</Text>
          </View>
          <Text style={styles.premiumCurrentName}>Premium Plan</Text>
          <Text style={styles.premiumCurrentSubtitle}>
            {cycleLabel} · {renewsLabel}
          </Text>
        </LinearGradient>

        {/* Billing detail card */}
        <View style={styles.billingCard}>
          {billingRows.map((row, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.billingRow}>
                <Text style={styles.billingKey}>{row.key}</Text>
                <Text style={styles.billingValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* What's included */}
        <View style={styles.includedCard}>
          <Text style={styles.includedTitle}>{"What's included"}</Text>
          {benefits.map((benefit, i) => (
            <View key={i} style={styles.benefitRow}>
              <RemixIcon name="check-line" size={20} color={theme.text.brand} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaPremium}>
        <Pressable
          style={styles.cancelBtn}
          onPress={() => { /* TODO: initiate IAP cancellation flow */ }}
        >
          <Text style={styles.cancelBtnLabel}>Cancel Subscription</Text>
        </Pressable>
      </View>
    </>
  );
}

// ---------- Screen ----------

export function SubscriptionScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const subQ = useSubscription();

  const isPremium =
    subQ.data?.subscriptionStatus === 'premium_active' ||
    subQ.data?.subscriptionStatus === 'trial_active';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar onBack={goBack} />
      {subQ.isLoading || !subQ.data ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : subQ.isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load subscription.</Text>
          <Pressable onPress={() => subQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : isPremium ? (
        <PremiumPlanContent sub={subQ.data} />
      ) : (
        <FreePlanContent sub={subQ.data} router={router} />
      )}
    </SafeAreaView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  navTitle:  { ...theme.typography.h2, color: theme.text.primary },
  navSpacer: { width: 24 },

  scroll: { flex: 1 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  retryText: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

  // ── Free plan body ────────────────────────────────────────
  bodyFree: {
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.l,
  },

  // currentPlanCard — muted bg, items-center, py-20, px-16, gap-4
  currentPlanCard: {
    backgroundColor: theme.surface.muted,
    borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 20,
    gap: 4,
    alignItems: 'center',
  },
  currentPlanPill: {
    backgroundColor: palette.neutral[200],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  currentPlanPillLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.secondary,
  },
  currentPlanName: {
    ...theme.typography.h1,
    color: theme.text.primary,
    textAlign: 'center',
  },
  currentPlanSubtitle: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },

  // Compare table — border, radius.m
  compareTable: {
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m,
    overflow: 'hidden',
    backgroundColor: theme.surface.default,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.m,
    backgroundColor: theme.surface.default,
  },
  compareHeader: { backgroundColor: theme.surface.muted },
  colFeature: { flex: 2 },
  colPlan:    { flex: 1 },
  compareHeaderText: {
    ...theme.typography.h4,
    color: theme.text.secondary,
  },
  compareFeatureText: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  compareValueTextSecondary: {
    ...theme.typography.body,
    color: theme.text.secondary,
    textAlign: 'center',
  },
  compareValueTextPremium: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
    color: theme.text.premium,
    textAlign: 'right',
  },

  // Plan selector
  planSelectorRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  planCard: {
    backgroundColor: theme.surface.premiumSubtle,
    borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 14,
    gap: theme.spacing.s,
  },
  planCardYearly:   { flex: 1 },
  planCardMonthly:  { width: 156, alignSelf: 'stretch' },
  planCardSelected: { borderWidth: 2, borderColor: theme.border.premium  },
  planCardUnselected: { borderWidth: 1, borderColor: theme.border.default },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCardTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
  },
  planCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  planCardPrice: {
    ...theme.typography.caption,
    color: theme.text.primary,
  },
  planCardPriceSecondary: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  planCardPromo: {
    ...theme.typography.caption,
    color: theme.text.premium,
  },
  savingsBadge: {
    backgroundColor: palette.accent[500],
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  savingsBadgeLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.onColor,
  },

  // CTA — Free
  cta: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.s,
    alignItems: 'center',
  },
  premiumBtnWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: palette.accent[50],
    width: '100%',
  },
  premiumBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.premium,
  },
  ctaCaption: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },

  // ── Premium plan body ─────────────────────────────────────
  bodyPremium: {
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.l,
  },

  premiumCurrentCard: {
    borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 20,
    gap: 4,
    alignItems: 'center',
    overflow: 'hidden',
  },
  premiumCurrentPill: {
    backgroundColor: theme.surface.default,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  premiumCurrentPillLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.premium,
  },
  premiumCurrentName: {
    ...theme.typography.h1,
    color: theme.text.onColor,
    textAlign: 'center',
  },
  premiumCurrentSubtitle: {
    ...theme.typography.caption,
    color: theme.text.onColor,
    textAlign: 'center',
  },

  billingCard: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    overflow: 'hidden',
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.l,
  },
  billingKey:   { ...theme.typography.caption, color: theme.text.secondary },
  billingValue: { ...theme.typography.h4,      color: theme.text.primary   },
  divider: { height: 1, backgroundColor: theme.border.default },

  includedCard: {
    backgroundColor: theme.surface.premiumSubtle,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 20,
    gap: 14,
  },
  includedTitle: { ...theme.typography.h3, color: theme.text.primary },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
  },
  benefitText: {
    ...theme.typography.caption,
    fontSize: 14,
    lineHeight: 20,
    color: theme.text.primary,
    flex: 1,
  },

  // CTA — Premium
  ctaPremium: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.xl,
  },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.error,
  },
});
