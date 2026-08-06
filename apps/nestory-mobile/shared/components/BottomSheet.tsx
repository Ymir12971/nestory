import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/shared/theme';

/**
 * DS Bottom Sheet — Figma `Molecule · Bottom Sheet`, as instanced by every sheet
 * in the redesign (e.g. O-Birthday Confirm popup 775:2297).
 *
 *   scrim    rgba(0,0,0,0.35)
 *   sheet    surface/card (white), radius/l top corners, pb SafeBtm-34,
 *            drop shadow 0 -4px 6px rgba(0,0,0,0.08)
 *   bsHandle 28px tall row, 36×4 bar, radius 3, border/default
 *
 * Sheets stack section blocks inside: `sheetSection.title` / `.body` (both
 * px 20 / py 16) and `sheetSection.cta` (px 20 / py 8, gap 16).
 */
export function BottomSheet({
  visible,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <Pressable style={s.scrim} onPress={onRequestClose} />
      <View style={s.sheet}>
        <View style={s.handleRow}>
          <View style={s.handle} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: theme.surface.card,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingBottom: theme.spacing.safeBtm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 12,
  },
  handleRow: { height: 28, alignItems: 'center', justifyContent: 'center' },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 3,
    backgroundColor: theme.border.default,
  },
});

/** Section blocks sheets compose from, so padding stays consistent. */
export const sheetSection = StyleSheet.create({
  title: {
    paddingHorizontal: theme.spacing.xl, // 20
    paddingVertical: theme.spacing.l, // 16
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
  },
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.s, // 8
    gap: theme.spacing.l, // 16
    alignItems: 'center',
  },
});
