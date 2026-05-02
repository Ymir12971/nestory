import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';

const TOTAL_STEPS = 5;
type Plan = 'yearly' | 'monthly';

// TODO(justin): replace with real App Store Connect product IDs after RevenueCat setup
// See docs/dev/PENDING_INTEGRATION_TODOS.md
const IAP_PRODUCT_ID_YEARLY   = 'nestory_premium_yearly_placeholder';
const IAP_PRODUCT_ID_MONTHLY  = 'nestory_premium_monthly_placeholder';

const FEATURES: Array<{ name: string; free: string; premium: string }> = [
  { name: 'AI Stories',             free: '2',          premium: 'Unlimited' },
  { name: 'Watermark-Free Sharing', free: 'icon-close', premium: 'icon-check' },
  { name: 'Highlights',             free: '10',         premium: 'Unlimited' },
  { name: 'Child Profiles',         free: '1',          premium: 'Unlimited' },
];

export function PlanScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>('yearly');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <View style={styles.navRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
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
      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text style={styles.headline}>Choose your plan</Text>
          <Text style={styles.subtitle}>Start with a free trial, cancel anytime</Text>
        </View>

        {/* Feature comparison table */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <View style={styles.colFeature}>
              <Text style={styles.colHeader}>Feature</Text>
            </View>
            <View style={styles.colPlan}>
              <Text style={styles.colHeader}>Free</Text>
            </View>
            <View style={styles.colPlan}>
              <Text style={[styles.colHeader, styles.colHeaderPremium]}>Premium</Text>
            </View>
          </View>
          {FEATURES.map((f) => (
            <View key={f.name} style={styles.tableRow}>
              <View style={styles.colFeature}>
                <Text style={styles.featureName}>{f.name}</Text>
              </View>
              <View style={styles.colPlan}>
                {f.free === 'icon-close' ? (
                  <RemixIcon name="close-circle-line" size={20} color={theme.text.hint} />
                ) : (
                  <Text style={styles.freeValue}>{f.free}</Text>
                )}
              </View>
              <View style={styles.colPlan}>
                {f.premium === 'icon-check' ? (
                  <RemixIcon name="check-line" size={20} color={theme.text.brand} />
                ) : (
                  <Text style={styles.premiumValue}>{f.premium}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.planCards}>
          <Pressable
            style={[styles.planCard, plan === 'yearly' ? styles.cardSelected : styles.cardUnselected]}
            onPress={() => setPlan('yearly')}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle}>Yearly</Text>
              <RemixIcon
                name="checkbox-circle-fill"
                size={24}
                color={plan === 'yearly' ? theme.surface.brand : theme.border.default}
              />
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.yearlyPrice}>$99.99/year</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>$20 Off</Text>
              </View>
            </View>
            <Text style={styles.promoText}>First month free</Text>
          </Pressable>

          <Pressable
            style={[
              styles.planCard,
              styles.planCardMonthly,
              plan === 'monthly' ? styles.cardSelected : styles.cardUnselected,
            ]}
            onPress={() => setPlan('monthly')}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle}>Monthly</Text>
              <RemixIcon
                name={plan === 'monthly' ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'}
                size={24}
                color={plan === 'monthly' ? theme.surface.brand : theme.text.hint}
              />
            </View>
            <Text style={styles.monthlyPrice}>$9.99/month</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.spacer} />

      {/* CTAs */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.premiumWrap, pressed && { opacity: 0.85 }]}
          onPress={() => {
            // TODO: RevenueCat IAP purchase — pending vicol approval
            router.replace('/');
          }}
        >
          <LinearGradient
            colors={[palette.accent[500], palette.accent[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumButton}
          >
            <Text style={styles.premiumLabel}>Try Premium Free for 1 Month</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.freeButton, pressed && { opacity: 0.85 }]}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.freeLabel}>Start with Free</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>By continuing, you agree to our</Text>
        <Text style={styles.footerText}>
          <Text style={styles.footerLink}>Terms of Service</Text>
          {' and '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    gap: theme.spacing.xl,
  },
  titleGroup: {
    gap: 12,
  },
  headline: {
    ...theme.typography.h1,
    color: theme.text.primary,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  table: {
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.surface.default,
  },
  tableHeaderRow: {
    backgroundColor: theme.surface.muted,
  },
  colFeature: {
    flex: 2,
  },
  colPlan: {
    flex: 1,
  },
  colHeader: {
    ...theme.typography.h4,
    color: theme.text.secondary,
  },
  colHeaderPremium: {
    color: theme.text.premium,
  },
  featureName: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  freeValue: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  premiumValue: {
    ...theme.typography.h3,
    color: theme.text.premium,
  },
  planCards: {
    flexDirection: 'row',
    gap: 8,
  },
  planCard: {
    flex: 3,
    backgroundColor: theme.surface.premiumSubtle,
    borderRadius: theme.radius.m,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  planCardMonthly: {
    flex: 2,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: theme.border.premium,
  },
  cardUnselected: {
    borderWidth: 1,
    borderColor: theme.border.default,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearlyPrice: {
    ...theme.typography.caption,
    color: theme.text.primary,
  },
  badge: {
    backgroundColor: theme.surface.premium,
    borderRadius: theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    ...theme.typography.tagBadge,
    color: theme.text.onColor,
  },
  promoText: {
    ...theme.typography.caption,
    color: theme.text.premium,
  },
  monthlyPrice: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  spacer: {
    flex: 1,
  },
  cta: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: theme.spacing.safeBtm,
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
    paddingBottom: theme.spacing.safeBtm,
    alignItems: 'center',
    gap: 2,
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
