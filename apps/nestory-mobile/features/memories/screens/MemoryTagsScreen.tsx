import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@/shared/theme';
import { useAsset, usePresetTags, useUpdateAsset, useUserTags } from '@/api';

export function MemoryTagsScreen() {
  const router = useRouter();
  const { memoryId } = useLocalSearchParams<{ memoryId?: string }>();

  const memoryQ      = useAsset(memoryId ?? null);
  const presetTagsQ  = usePresetTags();
  const userTagsQ    = useUserTags();
  const updateAsset  = useUpdateAsset(memoryId ?? '');

  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Hydrate selected from existing memory tags once it loads.
  useEffect(() => {
    if (memoryQ.data && selected.size === 0) {
      setSelected(new Set(memoryQ.data.tags));
    }
  }, [memoryQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (tag: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setSelected(prev => new Set(prev).add(trimmed));
    setCustomInput('');
  };

  const handleDone = async () => {
    if (!memoryId) {
      router.back();
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateAsset.mutateAsync({ tagValues: [...selected] });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save tags.');
    } finally {
      setSaving(false);
    }
  };

  // Combine presets + user-saved tags (case-insensitive dedupe so the chip grid stays unique).
  const presetTags = presetTagsQ.data ?? [];
  const userTags   = (userTagsQ.data ?? []).map(t => t.name);
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

  const isLoading = memoryQ.isLoading || presetTagsQ.isLoading;
  const isError   = memoryQ.isError || presetTagsQ.isError;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Tags</Text>
        <Pressable hitSlop={8} onPress={handleDone} disabled={saving || !memoryId}>
          <Text style={[styles.doneBtn, (saving || !memoryId) && { opacity: 0.5 }]}>
            {saving ? 'Saving…' : 'Done'}
          </Text>
        </Pressable>
      </View>

      {!memoryId ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Open from a memory to edit its tags.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Failed to load tags.</Text>
          <Pressable onPress={() => { memoryQ.refetch(); presetTagsQ.refetch(); }}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error && <Text style={styles.errorInline}>{error}</Text>}

          <View style={styles.chipGrid}>
            {allTags.map(tag => {
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
      )}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  retryText: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
  errorInline: {
    ...theme.typography.caption,
    color: theme.text.error,
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
