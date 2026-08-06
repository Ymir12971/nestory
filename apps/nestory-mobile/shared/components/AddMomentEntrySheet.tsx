import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { ADD_MOMENT_ENTRY_OPTIONS, type AddMomentEntryOption } from '@nestory/types';
import { theme } from '@/shared/theme';

// H-Add Moment Popup (2026-07 redesign): tapping "Add Moment" opens this sheet
// with 3 entry paths (Justin 2026-07-15: 3 options, config-driven). Each routes
// into the Add Moment page with a different starting mode.

const OPTION_META: Record<AddMomentEntryOption, { icon: string; label: string }> = {
  note:   { icon: 'quill-pen-line', label: 'Just a Note' },
  camera: { icon: 'camera-line',    label: 'Take a photo' },
  album:  { icon: 'image-line',     label: 'Choose from Album' },
};

interface AddMomentEntrySheetProps {
  visible:   boolean;
  onSelect:  (mode: AddMomentEntryOption) => void;
  onDismiss: () => void;
}

export function AddMomentEntrySheet({ visible, onSelect, onDismiss }: AddMomentEntrySheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add Moment</Text>

        {ADD_MOMENT_ENTRY_OPTIONS.map((opt, i) => (
          <View key={opt}>
            {i > 0 && <View style={styles.divider} />}
            <Pressable
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => onSelect(opt)}
            >
              <RemixIcon name={OPTION_META[opt].icon as any} size={22} color={theme.text.brand} />
              <Text style={styles.optionLabel}>{OPTION_META[opt].label}</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.cancelBtn} onPress={onDismiss}>
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
    backgroundColor: theme.surface.default,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm + theme.spacing.l,
    gap: theme.spacing.s,
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
    ...theme.typography.h3,
    color: theme.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.s,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    height: 52,
    paddingHorizontal: theme.spacing.s,
    borderRadius: theme.radius.s,
  },
  optionPressed: {
    backgroundColor: theme.surface.brandSubtle,
  },
  optionLabel: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border.default,
  },
  cancelBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.s,
  },
  cancelLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.secondary,
  },
});
