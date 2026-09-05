import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { Button } from '@/shared/components/Button';
import { SheetModal } from '@/shared/components/SheetModal';
import { theme } from '@/shared/theme';
import { track } from '@/shared/lib/analytics';

// global-Paywall (Figma 775:1819) — the single paywall for the whole app.
// The old contextual A/B/C/D variants are gone (2026-07 redesign, 模型 X 废弃);
// every "View Premium benefits" entry point opens this same sheet.

export type PaywallCycle = 'year' | 'month';

const BENEFITS = [
  'Unlimited child profiles',
  'Unlimited monthly Stories',
  'Watermark-Free Sharing',
  'Access to regenerate past Stories',
  'Annual Recap and more features',
];

interface PaywallModalProps {
  visible: boolean;
  onSubscribe: (cycle: PaywallCycle) => void;
  onDismiss: () => void;
  /** Analytics: which entry point opened the paywall (Handoff §5 paywall_viewed). */
  source?: string;
}

export function PaywallModal({ visible, onSubscribe, onDismiss, source }: PaywallModalProps) {
  const [cycle, setCycle] = useState<PaywallCycle>('year');

  useEffect(() => {
    if (visible) track('paywall_viewed', { source: source ?? 'unknown' });
  }, [visible, source]);

  return (
    <SheetModal
      visible={visible}
      onRequestClose={onDismiss}
      sheetStyle={styles.sheet}
      scrimColor="rgba(0,0,0,0.5)"
    >
      <View style={styles.handleWrap}>
        <View style={styles.handleBar} />
      </View>

      {/* header 775:1822 */}
      <View style={styles.header}>
        <Text style={styles.headline}>Upgrade to enjoy more!</Text>
      </View>

      {/* body 775:1990 — Premium card carries benefits + plan picker */}
      <View style={styles.body}>
        <View style={styles.premiumCard}>
          <View style={styles.premiumHeader}>
            <RemixIcon name="vip-crown-2-line" size={24} color={theme.text.premium} />
            <Text style={styles.premiumTitle}>Premium</Text>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((text) => (
              <View key={text} style={styles.benefit}>
                <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.planRow}>
            <PlanOption
              selected={cycle === 'year'}
              price="$100"
              caption="Billed annually"
              badge="~17% Off"
              onPress={() => setCycle('year')}
            />
            <PlanOption
              selected={cycle === 'month'}
              price="$10"
              caption="Billed monthly"
              onPress={() => setCycle('month')}
            />
          </View>
        </View>
      </View>

      {/* cta 775:1856 */}
      <View style={styles.cta}>
        <Button
          label="Upgrade to Premium"
          type="premium"
          onPress={() => onSubscribe(cycle)}
        />
        <Button label="Back" type="text" style={styles.dismissBtn} onPress={onDismiss} />
      </View>
    </SheetModal>
  );
}

function PlanOption({
  selected,
  price,
  caption,
  badge,
  onPress,
}: {
  selected: boolean;
  price: string;
  caption: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.planCard, selected ? styles.planCardSelected : styles.planCardUnselected]}
      onPress={onPress}
    >
      <View style={styles.planTop}>
        <Text style={styles.planPrice}>{price}</Text>
        <RemixIcon
          name={selected ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'}
          size={20}
          color={selected ? theme.border.premium : theme.border.strong}
        />
      </View>
      <View style={styles.planMeta}>
        <Text style={styles.planCaption}>{caption}</Text>
        {badge ? <Text style={styles.planBadge}>{badge}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({

  sheet: {
    backgroundColor: theme.surface.card,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },

  handleWrap: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 3,
    backgroundColor: theme.border.default,
  },

  header: {
    paddingHorizontal: theme.spacing.xl, // 20
    paddingVertical: theme.spacing.l, // 16
    alignSelf: 'stretch',
  },
  headline: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.primary,
  },

  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
  },

  // Premium card 775:2071 — radius/m, px16 py12, 1px border/premium
  premiumCard: {
    borderWidth: 1,
    borderColor: theme.border.premium,
    borderRadius: theme.radius.m,
    backgroundColor: theme.surface.premiumSubtle,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    gap: 12,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs, // 4
  },
  premiumTitle: {
    ...theme.typography.h2,
    color: theme.text.premium,
  },
  benefits: { gap: theme.spacing.s },
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

  // Plan picker 775:2097 — same two cards as O-Choose plan
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.s, // 8
  },
  planCard: {
    flex: 1,
    borderRadius: theme.radius.m,
    backgroundColor: theme.surface.card,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 14,
    gap: theme.spacing.s,
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: theme.border.premium,
  },
  planCardUnselected: {
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
  planCaption: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  planBadge: {
    ...theme.typography.h4, // Manrope SemiBold 14/20
    color: theme.text.premium,
  },

  // cta 775:1856 — px16 / pt16, buttons 12 apart
  cta: {
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.l, // 16
    gap: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  dismissBtn: { height: 44 },
});
