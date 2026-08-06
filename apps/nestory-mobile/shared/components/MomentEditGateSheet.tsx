import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet, sheetSection } from '@/shared/components/BottomSheet';
import { Button } from '@/shared/components/Button';
import { theme } from '@/shared/theme';

// Past-month Moment edit gates (2026-07 redesign; old everyone-read-only R-08
// is gone). Current-month moments never see these — the caller routes straight
// to the edit page.
//
//   variant="free"    — H-NoPremium request to edit Popup (744:3627): title
//                       "Upgrade to Edit", DS Premium CTA, then "View Premium
//                       benefits" and "Cancel" text buttons. Both premium
//                       actions land on the global Paywall (决策 4).
//   variant="premium" — H-Moment Edit Alert (745:1252): title "We have to let
//                       you know", DS Primary CTA labelled "OK", then "Cancel".
//
// Both sheets are title (px20/py16) + body (px20/py16) + cta (px20, py8, gap16).

interface MomentEditGateSheetProps {
  visible: boolean;
  variant: 'free' | 'premium';
  /** free: open the paywall. premium: proceed into the edit page. */
  onPrimary: () => void;
  /** free only: "View Premium benefits" secondary link. */
  onViewBenefits?: () => void;
  onDismiss: () => void;
}

export function MomentEditGateSheet({
  visible,
  variant,
  onPrimary,
  onViewBenefits,
  onDismiss,
}: MomentEditGateSheetProps) {
  const isFree = variant === 'free';
  return (
    <BottomSheet visible={visible} onRequestClose={onDismiss}>
      <View style={sheetSection.title}>
        <Text style={styles.title}>{isFree ? 'Upgrade to Edit' : 'We have to let you know'}</Text>
      </View>

      <View style={sheetSection.body}>
        <Text style={styles.body}>
          {isFree
            ? 'This Memory was used to create a Story.\nYou can upgrade to Premium to edit and recreate that Story.'
            : 'This Memory was used to create a Story.\n\nAs our Premium user, you have the chance to regenerate that Story later.'}
        </Text>
      </View>

      <View style={styles.cta}>
        <Button
          label={isFree ? 'Upgrade to Premium' : 'OK'}
          type={isFree ? 'premium' : 'primary'}
          onPress={onPrimary}
        />
        {isFree && onViewBenefits && (
          <Button label="View Premium benefits" type="text" onPress={onViewBenefits} />
        )}
        <Button label="Cancel" type="text" onPress={onDismiss} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.primary,
  },
  body: {
    ...theme.typography.body, // Inter Regular 16/20
    color: theme.text.primary, // not secondary
  },
  // cta 775:2225 — px20, py8, 16 between buttons
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.s,
    gap: theme.spacing.l,
    alignItems: 'center',
  },
});
