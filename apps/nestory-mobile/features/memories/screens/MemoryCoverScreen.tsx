import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@/shared/theme';
import { useAsset, useHighlight, useUpdateHighlight } from '@/api';

const CELL_SIZE = 170;

export function MemoryCoverScreen() {
  const router = useRouter();
  const { highlightId, assetId } = useLocalSearchParams<{
    highlightId?: string;
    assetId?:     string;
  }>();
  const highlightQ    = useHighlight(highlightId ?? null);
  const assetQ        = useAsset(assetId ?? null);
  const updateHighlight = useUpdateHighlight(highlightId ?? '');

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Pre-select whatever the highlight already points at; fall back to the first file.
  useEffect(() => {
    if (selectedFileId) return;
    const initial = highlightQ.data?.coverFileId ?? assetQ.data?.files[0]?.id ?? null;
    if (initial) setSelectedFileId(initial);
  }, [highlightQ.data?.coverFileId, assetQ.data, selectedFileId]);

  const handleDone = async () => {
    if (!highlightId || !selectedFileId) {
      router.back();
      return;
    }
    if (selectedFileId === highlightQ.data?.coverFileId) {
      router.back();
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateHighlight.mutateAsync({ coverFileId: selectedFileId });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update cover.');
    } finally {
      setSaving(false);
    }
  };

  const isLoading = highlightQ.isLoading || assetQ.isLoading;
  const isError   = highlightQ.isError || assetQ.isError;
  const files     = assetQ.data?.files ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Cover Photo</Text>
        <Pressable hitSlop={8} onPress={handleDone} disabled={saving}>
          <Text style={[styles.doneBtn, saving && { opacity: 0.5 }]}>
            {saving ? 'Saving…' : 'Done'}
          </Text>
        </Pressable>
      </View>

      {!highlightId || !assetId ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Missing highlight context.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load photos.</Text>
          <Pressable onPress={() => { highlightQ.refetch(); assetQ.refetch(); }}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>Choose which photo appears on the highlight card.</Text>
          {error && <Text style={styles.errorInline}>{error}</Text>}
          <FlatList
            data={files}
            keyExtractor={f => f.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedFileId;
              return (
                <Pressable
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  onPress={() => setSelectedFileId(item.id)}
                >
                  <Image source={{ uri: item.fileUrl }} style={styles.thumb} />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <RemixIcon name="check-line" size={16} color={theme.text.onColor} />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        </>
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
  doneBtn: { ...theme.typography.buttonLabelM, color: theme.text.brand },
  subtitle: {
    ...theme.typography.body,
    color: theme.text.secondary,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.l,
  },
  errorInline: {
    ...theme.typography.caption,
    color: theme.text.error,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  retryText: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
  grid: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.s,
  },
  row: { gap: theme.spacing.s },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: theme.radius.m,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: theme.border.brand,
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.border.strong,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.surface.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
