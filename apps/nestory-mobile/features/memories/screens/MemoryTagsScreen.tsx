import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';

const PRESET_TAGS = [
  'Playtime', 'Bath time', 'First times', 'Milestones',
  'Family', 'Friends', 'Outdoors', 'Food & eating',
  'Sleep', 'Silly moments', 'Learning', 'Doctor visit',
];

export function MemoryTagsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(['Playtime']));
  const [customInput, setCustomInput] = useState('');

  const toggle = (tag: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setSelected(prev => new Set(prev).add(trimmed));
    setCustomInput('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Tags</Text>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Text style={styles.doneBtn}>Done</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tag chips */}
        <View style={styles.chipGrid}>
          {PRESET_TAGS.map(tag => {
            const active = selected.has(tag);
            return (
              <Pressable
                key={tag}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                onPress={() => toggle(tag)}
              >
                {active && (
                  <RemixIcon name="check-line" size={14} color={theme.text.onColor} />
                )}
                <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelInactive]}>
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom tag input */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
  },
  navTitle: { ...theme.typography.h3, color: theme.text.primary },
  doneBtn: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
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
