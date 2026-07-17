import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, palette } from '@/shared/theme';

// Past-month Memory edit gates (2026-07 redesign; old everyone-read-only R-08
// is gone). Current-month memories never see these — the caller routes straight
// to the edit page.
//
//   variant="free"    — H-NoPremium request to edit Popup (744:3627): upgrade
//                       or view benefits; both land on the global Paywall
//                       (决策 4: unified MVP routing).
//   variant="premium" — H-Memory Edit Alert (745:1252): heads-up that the
//                       Story can be regenerated later, then continue to edit.

interface MemoryEditGateSheetProps {
  visible:  boolean;
  variant:  'free' | 'premium';
  /** free: open the paywall. premium: proceed into the edit page. */
  onPrimary: () => void;
  /** free only: "View Premium benefits" secondary link. */
  onViewBenefits?: () => void;
  onDismiss: () => void;
}

export function MemoryEditGateSheet({
  visible,
  variant,
  onPrimary,
  onViewBenefits,
  onDismiss,
}: MemoryEditGateSheetProps) {
  const isFree = variant === 'free';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>
          {isFree ? 'Upgrade to Edit' : 'We have to let you know'}
        </Text>
        <Text style={styles.body}>
          {isFree
            ? 'This Memory was used to create a Story. You can upgrade to Premium to edit and recreate that Story.'
            : 'This Memory was used to create a Story. As our Premium user, you have the chance to regenerate that Story later.'}
        </Text>

        <Pressable
          style={({ pressed }) => [styles.primaryWrap, pressed && { opacity: 0.88 }]}
          onPress={onPrimary}
        >
          <LinearGradient
            colors={
              isFree
                ? [palette.accent[500], palette.accent[400]]
                : [palette.primary[500], palette.primary[400]]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Text style={[styles.primaryLabel, isFree ? styles.premiumText : styles.onColorText]}>
              {isFree ? 'Upgrade to Premium' : 'Continue to Edit'}
            </Text>
          </LinearGradient>
        </Pressable>

        {isFree && onViewBenefits && (
          <Pressable style={styles.textBtn} onPress={onViewBenefits}>
            <Text style={styles.textBtnLabel}>View Premium benefits</Text>
          </Pressable>
        )}

        <Pressable style={styles.textBtn} onPress={onDismiss}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
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
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border.strong,
    alignSelf: 'center',
    marginBottom: theme.spacing.s,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: theme.text.primary,
  },
  body: {
    ...theme.typography.body,
    color: theme.text.secondary,
    lineHeight: 22,
  },
  primaryWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    marginTop: theme.spacing.s,
  },
  primaryBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    ...theme.typography.buttonLabelM,
  },
  premiumText: { color: theme.text.premium },
  onColorText: { color: theme.text.onColor },
  textBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
  cancelLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.secondary,
  },
});
