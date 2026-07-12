import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { theme } from '@/shared/theme';
import { usePresetTags, useUserTags } from '@/api';
import { showToast } from '@/features/ui/toast';

const MAX_TAGS = 10;

interface TagPickerSheetProps {
  visible:  boolean;
  selected: string[];
  onDone:   (tags: string[]) => void;
  onDismiss: () => void;
}

/** Bottom sheet for picking Memory tags (system presets + user tag library + custom input). */
export function TagPickerSheet({ visible, selected, onDone, onDismiss }: TagPickerSheetProps) {
  const presetTagsQ = usePresetTags();
  const userTagsQ   = useUserTags();

  const [draft, setDraft]           = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState('');

  // Reset the draft to the caller's current selection each time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(new Set(selected));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (tag: string) => {
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        if (next.size >= MAX_TAGS) {
          showToast({ type: 'warning', message: 'Maximum 10 tags per memory.' });
          return prev;
        }
        next.add(tag);
      }
      return next;
    });
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setDraft(prev => {
      if (prev.has(trimmed)) return prev;
      if (prev.size >= MAX_TAGS) {
        showToast({ type: 'warning', message: 'Maximum 10 tags per memory.' });
        return prev;
      }
      return new Set(prev).add(trimmed);
    });
    setCustomInput('');
  };

  const handleDone = () => {
    onDone([...draft]);
    onDismiss();
  };

  // Combine presets + user-saved tags (case-insensitive dedupe so the chip grid stays unique).
  const presetTags = presetTagsQ.data ?? [];
  const userTags    = (userTagsQ.data ?? []).map(t => t.name);
  const allTags = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of [...presetTags, ...userTags]) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
    return out;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Tags</Text>
          <Pressable hitSlop={8} onPress={handleDone}>
            <Text style={styles.doneBtn}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chipGrid}>
            {allTags.map(tag => {
              const active = draft.has(tag);
              return (
                <Pressable
                  key={tag}
                  style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                  onPress={() => toggle(tag)}
                >
                  {active && <RemixIcon name="check-line" size={14} color={theme.text.onColor} />}
                  <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelInactive]}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="Add a custom tag…"
              placeholderTextColor={theme.text.hint}
              returnKeyType="done"
              onSubmitEditing={addCustom}
            />
            <Pressable style={styles.addBtn} onPress={addCustom}>
              <RemixIcon name="add-line" size={20} color={theme.text.brand} />
            </Pressable>
          </View>
        </ScrollView>
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
    maxHeight: '75%',
    backgroundColor: theme.surface.default,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border.strong,
    alignSelf: 'center',
    marginBottom: theme.spacing.s,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
  },
  title: { ...theme.typography.h3, color: theme.text.primary },
  doneBtn: { ...theme.typography.buttonLabelM, color: theme.text.brand },
  scroll: { flexGrow: 0 },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.s,
    gap: theme.spacing.l,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: theme.surface.brand,
    borderColor: theme.surface.brand,
  },
  chipInactive: {
    backgroundColor: theme.surface.card,
    borderColor: theme.border.default,
  },
  chipLabel: { ...theme.typography.tagBadge },
  chipLabelActive: { color: theme.text.onColor },
  chipLabelInactive: { color: theme.text.primary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    height: 48,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  addBtn: { padding: 4 },
});
