import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { theme, palette } from '@/shared/theme';

export type PaywallVariant = 'A' | 'B' | 'C' | 'D';
export type PaywallCycle = 'year' | 'month';

const HEADLINES: Record<PaywallVariant, string> = {
  A: "Your baby's first year only comes once",
  B: "Don't miss a single milestone",
  C: "Keep the story going",
  D: "Your family is growing",
};

const BENEFITS: Record<PaywallVariant, string[]> = {
  A: [
    'Unlimited monthly Stories — never miss a chapter',
    'Watermark-Free Sharing',
    'Unlimited Highlights',
    'Extra Features like Birthday Celebrations',
  ],
  B: [
    'Unlimited Highlights — capture every milestone',
    'Unlimited monthly Stories',
    'Watermark-Free Sharing',
    'Extra Features like Birthday Celebrations',
  ],
  C: [
    'Unlimited monthly Stories — never miss a chapter',
    'Watermark-Free Sharing',
    'Unlimited Highlights',
    'Extra Features like Birthday Celebrations',
  ],
  D: [
    'Unlimited child profiles — one place for every child',
    'Unlimited monthly Stories',
    'Unlimited Highlights',
    'Watermark-Free Sharing',
  ],
};

interface PaywallModalProps {
  visible: boolean;
  variant?: PaywallVariant;
  onSubscribe: (cycle: PaywallCycle) => void;
  onDismiss: () => void;
}

export function PaywallModal({
  visible,
  variant = 'A',
  onSubscribe,
  onDismiss,
}: PaywallModalProps) {
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
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handleBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headline}>{HEADLINES[variant]}</Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefits}>
            {BENEFITS[variant].map((text, i) => (
              <View key={i} style={styles.benefit}>
                <RemixIcon name="vip-crown-2-line" size={16} color={theme.text.premium} />
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Pricing */}
          <View style={styles.pricing}>
            <View style={styles.segmented}>
              <View style={styles.segSelected}>
                <Text style={styles.segSelectedLabel}>Yearly</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeLabel}>Save $19</Text>
                </View>
              </View>
              <View style={styles.segUnselected}>
                <Text style={styles.segUnselectedLabel}>Monthly</Text>
              </View>
            </View>
            <View style={styles.priceDetails}>
              <Text style={styles.price}>$99.99/year</Text>
              <Text style={styles.priceSub}>~$8.33/mo · First month free</Text>
            </View>
          </View>

          {/* CTA */}
          <View style={styles.cta}>
            <Pressable
              style={({ pressed }) => [styles.ctaBtnWrap, pressed && { opacity: 0.88 }]}
              onPress={() => onSubscribe('year')}
            >
              <LinearGradient
                colors={[palette.accent[500], palette.accent[400]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtn}
              >
                <Text style={styles.ctaBtnLabel}>Start Free Trial</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.dismissBtn} onPress={onDismiss}>
              <Text style={styles.dismissBtnLabel}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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

  // Sheet
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

  // Handle
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

  // Header
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: theme.spacing.l,
  },
  headline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 38,
    color: theme.text.primary,
  },

  // Benefits
  benefits: {
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 12,
    gap: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  benefitText: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.text.primary,
  },

  // Pricing
  pricing: {
    backgroundColor: palette.accent[50],
    padding: theme.spacing.l,
    gap: 12,
  },
  segmented: {
    flexDirection: 'row',
    height: 40,
    borderWidth: 1,
    borderColor: theme.text.premium,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.card,
    padding: 3,
  },
  segSelected: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface.premium,
    borderRadius: theme.radius.full,
    gap: 8,
  },
  segSelectedLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: theme.text.premium,
  },
  saveBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  saveBadgeLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: theme.text.premium,
  },
  segUnselected: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  segUnselectedLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: theme.text.primary,
  },
  priceDetails: {
    alignItems: 'center',
    gap: 2,
  },
  price: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 38,
    color: theme.text.primary,
  },
  priceSub: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },

  // CTA
  cta: {
    paddingTop: 16,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.l,
    gap: 12,
    alignItems: 'center',
  },
  ctaBtnWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: palette.accent[50],
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
