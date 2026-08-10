import { Pressable, StyleSheet, Text, View } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { ADD_MOMENT_ENTRY_OPTIONS, type AddMomentEntryOption } from '@nestory/types';
import { BottomSheet, sheetSection } from '@/shared/components/BottomSheet';
import { theme } from '@/shared/theme';

// H-Add Memory Popup (Figma 742:2985): "Add Memory" title over a bordered list
// card of 56pt rows, each with a leading glyph and a trailing chevron.
//
// The design and its annotation only draw TWO rows — "Just a note" and "Choose
// from album". The third ("Take a photo") is Justin's 2026-07-15 decision and is
// config-driven via ADD_MOMENT_ENTRY_OPTIONS, so it stays.
const OPTION_META: Record<AddMomentEntryOption, { icon: string; label: string }> = {
  note: { icon: 't-box-line', label: 'Just a note' },
  camera: { icon: 'camera-line', label: 'Take a photo' },
  album: { icon: 'multi-image-line', label: 'Choose from album' },
};

interface AddMomentEntrySheetProps {
  visible: boolean;
  onSelect: (mode: AddMomentEntryOption) => void;
  onDismiss: () => void;
}

export function AddMomentEntrySheet({ visible, onSelect, onDismiss }: AddMomentEntrySheetProps) {
  return (
    <BottomSheet visible={visible} onRequestClose={onDismiss}>
      <View style={sheetSection.title}>
        <Text style={styles.title}>Add Moment</Text>
      </View>

      <View style={styles.listBlock}>
        <View style={styles.sourceList}>
          {ADD_MOMENT_ENTRY_OPTIONS.map((opt, i) => (
            <View key={opt}>
              {i > 0 && <View style={styles.divider} />}
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => onSelect(opt)}
              >
                <RemixIcon
                  name={OPTION_META[opt].icon as any}
                  size={24}
                  color={theme.text.primary}
                />
                <Text style={styles.rowLabel}>{OPTION_META[opt].label}</Text>
                <RemixIcon name="arrow-right-s-line" size={24} color={theme.text.hint} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.primary,
  },
  // bsContent 775:2151 — px16 / py16 around the list card
  listBlock: {
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.l,
  },
  sourceList: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l, // 16
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m, // 12
    height: 56,
    paddingHorizontal: theme.spacing.l, // 16
  },
  rowPressed: { backgroundColor: theme.surface.brandSubtle },
  rowLabel: {
    ...theme.typography.body,
    color: theme.text.primary,
    flex: 1,
  },
  divider: { height: 1, backgroundColor: theme.border.default },
});
