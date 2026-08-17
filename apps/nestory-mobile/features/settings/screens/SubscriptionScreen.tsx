import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import type { Subscription } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { useSubscription, queryClient, queryKeys } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { BottomSheet, sheetSection } from '@/shared/components/BottomSheet';
import { PremiumCrown } from '@/shared/components/PremiumCrown';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { NavBar } from '@/shared/components/NavBar';
import { purchasePlan, openManageSubscriptions, isPurchasesAvailable } from '@/features/billing/purchases';
import { track } from '@/shared/lib/analytics';
import { showToast } from '@/features/ui/toast';

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

// 764:3775 / 764:3844 — both variants title the page "Current Plan"
const FREE_INCLUDES = ['One child profile', 'Two Stories', 'Watermarked Sharing'];
const PREMIUM_BENEFITS = [
  'Unlimited child profiles',
  'Unlimited monthly Stories',
  'Watermark-Free Sharing',
  'Access to regenerate past Stories',
  'Annual Recap and more features',
];

// ---------- ST-02A Free Plan ----------

function FreePlanContent({ sub, router }: { sub: Subscription; router: ReturnType<typeof useRouter> }) {
  const [cycle, setCycle] = useState<PlanCycle>('yearly');
  const [purchasing, setPurchasing] = useState(false);

  const handleUpgrade = async () => {
    if (!isPurchasesAvailable()) {
      showToast({ type: 'warning', message: 'In-app purchases require the mobile app.' });
      return;
    }
    setPurchasing(true);
    try {
      const res = await purchasePlan(cycle);
      if (res.status === 'purchased') {
        // Refresh — once the webhook flips the row, this screen re-renders to Premium.
        await queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
        track('subscribe_success', { cycle, source: 'settings' });
        showToast({ type: 'success', message: 'Welcome to Premium!' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Please try again.';
      showToast({ type: 'error', message: `Purchase failed: ${msg}` });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.bodyFree}
        showsVerticalScrollIndicator={false}
      >
        {/* currentPlanCard 764:3779 — plan name + what Free includes */}
        <View style={styles.currentPlanCard}>
          <Text style={styles.currentPlanName}>Free Plan</Text>
          <View style={styles.benefitList}>
            {FREE_INCLUDES.map((text) => (
              <View key={text} style={styles.benefitRow}>
                <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.secondary} />
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* pmBenefits 764:4008 — the design has no Free-vs-Premium compare table */}
        <View style={styles.pmBenefits}>
          <Text style={styles.pmHeading}>Enjoy more benefits with Premium:</Text>
          <View style={styles.premiumCard}>
            <View style={styles.premiumCardHead}>
              <RemixIcon name="vip-crown-2-line" size={24} color={theme.text.premium} />
              <Text style={styles.premiumCardTitle}>Premium</Text>
            </View>
            <View style={styles.benefitList}>
              {PREMIUM_BENEFITS.map((text) => (
                <View key={text} style={styles.benefitRow}>
                  <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
                  <Text style={styles.benefitText}>{text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.planSelectorRow}>
              <Pressable
                style={[styles.planCard, cycle === 'yearly' ? styles.planCardSelected : styles.planCardUnselected]}
                onPress={() => setCycle('yearly')}
              >
                <View style={styles.planCardHeader}>
                  <Text style={styles.planCardPrice}>$100</Text>
                  <RemixIcon
                    name={cycle === 'yearly' ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'}
                    size={20}
                    color={cycle === 'yearly' ? theme.border.premium : theme.border.strong}
                  />
                </View>
                <View style={styles.planCardMeta}>
                  <Text style={styles.planCardCaption}>Billed annually</Text>
                  <Text style={styles.planCardBadge}>~17% Off</Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.planCard,
                  styles.planCardMonthly,
                  cycle === 'monthly' ? styles.planCardSelected : styles.planCardUnselected,
                ]}
                onPress={() => setCycle('monthly')}
              >
                <View style={styles.planCardHeader}>
                  <Text style={styles.planCardPrice}>$10</Text>
                  <RemixIcon
                    name={cycle === 'monthly' ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'}
                    size={20}
                    color={cycle === 'monthly' ? theme.border.premium : theme.border.strong}
                  />
                </View>
                <Text style={styles.planCardCaption}>Billed monthly</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* cta 765:4051 — no trial copy: the product has no free-trial period */}
      <View style={styles.cta}>
        <Button
          label={purchasing ? 'Processing…' : 'Upgrade to Premium'}
          type="premium"
          disabled={purchasing}
          onPress={handleUpgrade}
        />
        <Text style={styles.ctaCaption}>
          Auto-renews until canceled. Manage in Settings.{'\n'}
          <Text style={styles.ctaLink} onPress={() => router.push('/onboarding/terms')}>
            Terms of Service
          </Text>
          <Text style={styles.ctaLinkPlain}>{' · '}</Text>
          <Text style={styles.ctaLink} onPress={() => router.push('/onboarding/privacy')}>
            Privacy Policy
          </Text>
        </Text>
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
  // 764:3857 — Plan / Price / Next billing
  const billingRows: { key: string; value: string }[] = [
    { key: 'Plan', value: cycleLabel },
    { key: 'Price', value: sub.billingCycle === 'monthly' ? '$10 / month' : '$100 / year' },
    ...(sub.expiresAt
      ? [{ key: 'Next billing', value: formatExpiry(sub.expiresAt) }]
      : []),
  ];
  const benefits = sub.benefits.length > 0
    ? sub.benefits
    : [
        'Unlimited child profiles',
        'Unlimited monthly Stories',
        'Watermark-Free Sharing',
        'Access to regenerate past Stories',
        'Annual Recap and more features',
      ];

  // Two-step cancel flow (ST-02 sheets). 方案A (Justin 2026-07-16): we collect
  // the reason, then DEEP-LINK to the platform's subscription management —
  // iOS/Android don't allow true in-app cancellation. The Plan-cancelled page
  // shows on a later visit once the RevenueCat webhook flips the status.
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2>(0);
  const [reason, setReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');

  const confirmCancel = async () => {
    track('subscription_cancelled', {
      ...(reason ? { reason } : {}),
      ...(otherText.trim() ? { otherText: otherText.trim() } : {}),
    });
    setCancelStep(0);
    await openManageSubscriptions();
    showToast({
      type: 'info',
      message: 'Finish canceling in your store settings. Premium stays active until the end of the billing period.',
      duration: 6000,
    });
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.bodyPremium}
        showsVerticalScrollIndicator={false}
      >
        {/* currentPlanCard 764:3848 — 160.79° accent/400 → accent/500 with the
            same three amber blobs as global-Welcome to premium */}
        <LinearGradient
          colors={[palette.accent[400], palette.accent[500]]}
          locations={[0, 0.7071]}
          start={{ x: 0.336, y: 0.028 }}
          end={{ x: 0.664, y: 0.972 }}
          style={styles.premiumCurrentCard}
        >
          <View style={[styles.blob, styles.blobTopLeft]} />
          <View style={[styles.blob, styles.blobRight]} />
          <View style={[styles.blob, styles.blobTopRight]} />
          <PremiumCrown size={41} color={theme.text.onColor} />
          <Text style={styles.premiumCurrentName}>Premium Plan</Text>
        </LinearGradient>

        {/* billingDetailCard 764:3857 — plain rows (no dividers) + a centred note */}
        <View style={styles.billingCard}>
          {billingRows.map((row, i) => (
            <View key={i} style={styles.billingRow}>
              <Text style={styles.billingKey}>{row.key}</Text>
              <Text style={styles.billingValue}>{row.value}</Text>
            </View>
          ))}
          <Text style={styles.billingNote}>Auto-renews until canceled. Manage in Settings.</Text>
        </View>

        {/* includedCard 764:3867 */}
        <View style={styles.includedCard}>
          <Text style={styles.includedTitle}>{"What's included"}</Text>
          {benefits.map((benefit, i) => (
            <View key={i} style={styles.benefitRow}>
              <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* cta 764:3890 — DS Destructive, full width */}
      <View style={styles.ctaPremium}>
        <Button
          label="Cancel Subscription"
          type="destructive"
          style={styles.cancelBtn}
          onPress={() => setCancelStep(1)}
        />
      </View>

      {/* ST-02 / Sheet · Cancel Step 1 — loss list */}
      <BottomSheet visible={cancelStep === 1} onRequestClose={() => setCancelStep(0)}>
        <View style={sheetSection.title}>
          <Text style={styles.sheetTitle}>Your little one's story isn't finished yet</Text>
          <Text style={styles.sheetBody}>Cancel now and you'll lose:</Text>
        </View>
        <View style={sheetSection.body}>
          <View style={styles.lossList}>
            {benefits.map((b) => (
              <View key={b} style={styles.lossRow}>
                <Text style={styles.lossX}>✕</Text>
                <Text style={styles.lossText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={sheetSection.cta}>
          <Button label="Keep my plan" onPress={() => setCancelStep(0)} />
          <Button
            label="Continue to cancel"
            type="destructive"
            style={styles.cancelTextBtn}
            onPress={() => setCancelStep(2)}
          />
        </View>
      </BottomSheet>

      {/* ST-02 / Sheet · Cancel Step 2 — reason survey (optional) */}
      <BottomSheet visible={cancelStep === 2} onRequestClose={() => setCancelStep(0)}>
        <View style={sheetSection.title}>
          <Text style={styles.sheetTitle}>We'd love to know why you're leaving</Text>
          <Text style={styles.sheetBody}>Optional — your feedback helps us improve.</Text>
        </View>
        <View style={sheetSection.body}>
          {CANCEL_REASONS.map((r) => (
            <Pressable key={r} style={styles.reasonRow} onPress={() => setReason(r)}>
              <View style={reason === r ? styles.radioOn : styles.radioOff}>
                {reason === r && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.reasonLabel}>{r}</Text>
            </Pressable>
          ))}
          {reason === 'Other' && (
            <>
              <Input
                multiline
                value={otherText}
                onChangeText={(t) => setOtherText(t.slice(0, 200))}
                placeholder="Tell us more (optional)"
              />
              <Text style={styles.otherCount}>{otherText.length} / 200</Text>
            </>
          )}
        </View>
        <View style={sheetSection.cta}>
          <Button
            label="Confirm to Cancel"
            type="destructive"
            style={styles.cancelTextBtn}
            onPress={() => void confirmCancel()}
          />
        </View>
      </BottomSheet>
    </>
  );
}

const CANCEL_REASONS = [
  'Too expensive',
  'Not using it enough',
  'Missing a feature I need',
  'Switching to another app',
  'Other',
] as const;

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
      <NavBar title="Current Plan" onBack={goBack} />
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

  // currentPlanCard 764:3779 — white with a border/strong edge, px16 / py12
  currentPlanCard: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    gap: theme.spacing.l,
    alignItems: 'center',
  },
  currentPlanName: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.primary,
    textAlign: 'center',
  },
  currentPlanSubtitle: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },

  // Benefit lists (shared by the Free summary and the Premium card)
  benefitList: { alignSelf: 'stretch', gap: theme.spacing.s },
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

  // pmBenefits 764:4008
  pmBenefits: { gap: 12 },
  pmHeading: {
    ...theme.typography.h2,
    color: theme.text.primary,
  },
  premiumCard: {
    backgroundColor: theme.surface.premiumSubtle,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    gap: 12,
  },
  premiumCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  premiumCardTitle: {
    ...theme.typography.h2,
    color: theme.text.premium,
  },

  // Plan selector 764:4035 — same two cards as O-Choose plan
  planSelectorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.s,
  },
  planCard: {
    flex: 1,
    backgroundColor: theme.surface.card,
    borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 14,
    gap: theme.spacing.s,
  },
  planCardMonthly: { height: 94 },
  planCardSelected: { borderWidth: 2, borderColor: theme.border.premium },
  planCardUnselected: { borderWidth: 1, borderColor: theme.border.strong },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCardPrice: {
    ...theme.typography.h3, // Manrope SemiBold 16/22
    color: theme.text.primary,
  },
  planCardMeta: { gap: theme.spacing.xs },
  planCardCaption: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  planCardBadge: {
    ...theme.typography.h4,
    color: theme.text.premium,
  },

  // CTA — Free
  // cta 765:4051 — px20 / pt8, DS Premium button over the legal line
  cta: {
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.xl,
    gap: 12,
    alignItems: 'center',
  },
  ctaCaption: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },
  ctaLink: {
    color: theme.text.brand,
    textDecorationLine: 'underline',
  },
  ctaLinkPlain: { color: theme.text.brand },

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
  premiumCurrentName: {
    ...theme.typography.h1,
    color: theme.text.onColor,
    textAlign: 'center',
  },
  // 764:3854-3856 — the same amber blobs as global-Welcome to premium
  blob: { position: 'absolute', borderRadius: theme.radius.full },
  blobTopLeft: { left: -42, top: -49, width: 140, height: 140, backgroundColor: '#f8aa14' },
  blobRight: { left: 285, top: 82, width: 63, height: 63, backgroundColor: '#f9b21a' },
  blobTopRight: { left: 255, top: -11, width: 36, height: 36, backgroundColor: '#f9b21a' },
  billingNote: {
    ...theme.typography.caption,
    color: theme.text.secondary,
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

  // CTA — Premium
  ctaPremium: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.xl,
  },
  // Destructive text buttons in the cancel sheets sit at 44 like the DS instances
  cancelTextBtn: { height: 44 },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.error,
  },

  // Cancel-flow sheets (ST-02 Step 1 / Step 2)
  sheetScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: theme.surface.card,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm + theme.spacing.l,
    gap: theme.spacing.m,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border.strong,
    alignSelf: 'center',
    marginBottom: theme.spacing.s,
  },
  sheetTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: theme.text.primary,
  },
  sheetBody: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  lossList: {
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
  },
  lossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  lossX: {
    ...theme.typography.body,
    color: theme.text.error,
  },
  lossText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  keepBtn: {
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.s,
  },
  keepBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  continueCancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueCancelLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.secondary,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingVertical: theme.spacing.s,
  },
  radioOff: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border.strong,
  },
  radioOn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.surface.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.surface.brand,
  },
  reasonLabel: {
    flex: 1,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  otherInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.s,
    ...theme.typography.body,
    color: theme.text.primary,
    textAlignVertical: 'top',
  },
  otherCount: {
    ...theme.typography.caption,
    color: theme.text.hint,
    textAlign: 'right',
  },
  confirmCancelBtn: {
    height: 52,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.text.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.s,
  },
  confirmCancelLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.error,
  },
});
