import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { theme, palette } from '@/shared/theme';

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
}

export function PaywallModal({ visible, onSubscribe, onDismiss }: PaywallModalProps) {
  const [cycle, setCycle] = useState<PaywallCycle>('year');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.sheet}>
          <View style={styles.handleWrap}>
            <View style={styles.handleBar} />
          </View>

          <Text style={styles.headline}>Upgrade to enjoy more!</Text>

          {/* Premium card: benefits + plan picker */}
          <View style={styles.premiumCard}>
            <View style={styles.premiumHeader}>
              <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
              <Text style={styles.premiumTitle}>Premium</Text>
            </View>

            <View style={styles.benefits}>
              {BENEFITS.map(text => (
                <View key={text} style={styles.benefit}>
                  <Text style={styles.benefitBullet}>•</Text>
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

          {/* CTA */}
          <View style={styles.cta}>
            <Pressable
              style={({ pressed }) => [styles.ctaBtnWrap, pressed && { opacity: 0.88 }]}
              onPress={() => onSubscribe(cycle)}
            >
              <LinearGradient
                colors={[palette.accent[500], palette.accent[400]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtn}
              >
                <Text style={styles.ctaBtnLabel}>Upgrade to Premium</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.dismissBtn} onPress={onDismiss}>
              <Text style={styles.dismissBtnLabel}>Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
        {selected ? (
          <View style={styles.radioChecked}>
            <RemixIcon name="check-line" size={12} color={theme.text.onColor} />
          </View>
        ) : (
          <View style={styles.radioUnchecked} />
        )}
      </View>
      <Text style={styles.planCaption}>{caption}</Text>
      {badge ? <Text style={styles.planBadge}>{badge}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

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

  headline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 38,
    color: theme.text.primary,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: theme.spacing.l,
  },

  // Premium card
  premiumCard: {
    marginHorizontal: theme.spacing.l,
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
  benefits: {
    gap: 8,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  benefitBullet: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  benefitText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.text.primary,
  },

  // Plan picker
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
  planCardSelected: {
    borderWidth: 2,
    borderColor: theme.text.premium,
  },
  planCardUnselected: {
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
  planCaption: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  planBadge: {
    ...theme.typography.caption,
    color: theme.text.premium,
  },

  // CTA
  cta: {
    paddingTop: 20,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.l,
    gap: 12,
    alignItems: 'center',
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
  dismissBtn: {
    height: 44,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  dismissBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
});
