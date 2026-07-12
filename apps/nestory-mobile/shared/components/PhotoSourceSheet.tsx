import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { theme } from '@/shared/theme';

interface PhotoSourceSheetProps {
  visible:         boolean;
  onTakePhoto:     () => void;
  onChooseLibrary: () => void;
  onDismiss:       () => void;
}

/** Bottom sheet offering "Take Photo" vs "Choose from Library" (H-02 / H-04 "+" button). */
export function PhotoSourceSheet({ visible, onTakePhoto, onChooseLibrary, onDismiss }: PhotoSourceSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add Photo</Text>

        <Pressable style={({ pressed }) => [styles.option, pressed && styles.optionPressed]} onPress={onTakePhoto}>
          <RemixIcon name="camera-line" size={22} color={theme.text.brand} />
          <Text style={styles.optionLabel}>Take Photo</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={({ pressed }) => [styles.option, pressed && styles.optionPressed]} onPress={onChooseLibrary}>
          <RemixIcon name="image-line" size={22} color={theme.text.brand} />
          <Text style={styles.optionLabel}>Choose from Library</Text>
        </Pressable>

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
