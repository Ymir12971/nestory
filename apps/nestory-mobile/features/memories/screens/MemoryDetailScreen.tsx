import { ActivityIndicator, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Memory } from '@nestory/types';
import { theme } from '@/shared/theme';
import { useAsset } from '@/api';

const SCREEN_W = Dimensions.get('window').width;

const PHOTO_CENTER_W = 225;
const PHOTO_CENTER_H = 300;
const PHOTO_SIDE_W   = 195;
const PHOTO_SIDE_H   = 260;
const PHOTO_GAP      = 12;
const CAROUSEL_PADDING = (SCREEN_W - PHOTO_CENTER_W) / 2;
const CAROUSEL_INIT_X  = PHOTO_SIDE_W + PHOTO_GAP;

function formatCapturedAt(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

export function MemoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryQ = useAsset(id ?? null);

  return (
    <View style={styles.root}>
      <View style={{ height: insets.top, backgroundColor: theme.surface.default }} />

      {memoryQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : memoryQ.isError || !memoryQ.data ? (
        <View style={styles.center}>
          <View style={styles.navBar}>
            <Pressable hitSlop={8} onPress={() => router.back()}>
              <RemixIcon name="arrow-left-line" size={24} color={theme.text.primary} />
            </Pressable>
            <Text style={styles.navTitle}>Memory</Text>
            <View style={styles.navSpacer} />
          </View>
          <Text style={styles.errorText}>Failed to load memory.</Text>
          <Pressable onPress={() => memoryQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <Body memory={memoryQ.data} />
      )}

      <View style={{ height: insets.bottom }} />
    </View>
  );
}

function Body({ memory }: { memory: Memory }) {
  const router = useRouter();
  const dotCount = memory.files.length;

  return (
    <>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Memory</Text>
        {memory.isEditable ? (
          <Pressable hitSlop={8} onPress={() => router.push(`/memory/${memory.id}/edit`)}>
            <Text style={styles.editButton}>Edit</Text>
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}
      </View>

      {/* H-04 Read-Only Banner — historical months only (R-08) */}
      {!memory.isEditable && (
        <View style={styles.bannerWrap}>
          <View style={styles.banner}>
            <RemixIcon name="error-warning-line" size={16} color={theme.text.warning} />
            <Text style={styles.bannerText}>
              This memory was used to create a Story. We keep it as-is to preserve the authenticity of your stories.
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {memory.files.length > 0 && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={PHOTO_CENTER_W + PHOTO_GAP}
              decelerationRate="fast"
              contentOffset={{ x: memory.files.length > 1 ? CAROUSEL_INIT_X : 0, y: 0 }}
              style={styles.carouselScroll}
              contentContainerStyle={[
                styles.carouselContent,
                { paddingHorizontal: CAROUSEL_PADDING },
              ]}
            >
              {memory.files.map((f, i) => (
                <Image
                  key={f.id}
                  source={{ uri: f.fileUrl }}
                  style={[
                    styles.photoCenter,
                    i < memory.files.length - 1 ? { marginRight: PHOTO_GAP } : null,
                  ]}
                />
              ))}
            </ScrollView>

            {dotCount > 1 && (
              <View style={styles.dots}>
                {Array.from({ length: dotCount }).map((_, i) => (
                  <View key={i} style={i === 0 ? styles.dotActive : styles.dotInactive} />
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.body}>
          {memory.textNote ? (
            <Text style={styles.noteText}>{memory.textNote}</Text>
          ) : null}

          {memory.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {memory.tags.map(tag => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagLabel}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {memory.isHighlight && memory.linkedHighlight && (
            <Pressable
              style={styles.highlightCard}
              onPress={() => router.push(`/highlight/${memory.linkedHighlight!.id}`)}
            >
              {memory.files[0] ? (
                <Image source={{ uri: memory.files[0].fileUrl }} style={styles.highlightPhoto} />
              ) : (
                <View style={styles.highlightPhoto} />
              )}
              <View style={styles.highlightBody}>
                <View style={styles.highlightHeadingRow}>
                  <RemixIcon name="star-fill" size={20} color={theme.text.brand} />
                  <Text style={styles.highlightHeading}>Marked as a highlight</Text>
                </View>
                {memory.linkedHighlight.title ? (
                  <Text style={styles.highlightTitle} numberOfLines={2}>
                    {memory.linkedHighlight.title}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}

          <View style={styles.metaRow}>
            <RemixIcon name="time-line" size={16} color={theme.text.secondary} />
            <Text style={styles.metaText}>{formatCapturedAt(memory.capturedAt)}</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.surface.default,
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

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    height: 56,
  },
  navTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
  },
  editButton: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    lineHeight: 22,
    color: theme.text.brand,
  },
  navSpacer: { width: 40 },

  bannerWrap: {
    paddingHorizontal: theme.spacing.xl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    backgroundColor: theme.surface.warningSubtle,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
  },
  bannerText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: theme.text.warning,
  },

  carouselScroll: {
    height: PHOTO_CENTER_H,
    marginTop: theme.spacing.s,
  },
  carouselContent: {
    alignItems: 'flex-end',
  },
  photoCenter: {
    width: PHOTO_CENTER_W,
    height: PHOTO_CENTER_H,
    borderRadius: theme.radius.l,
    backgroundColor: theme.border.default,
  },
  photoSide: {
    width: PHOTO_SIDE_W,
    height: PHOTO_SIDE_H,
    borderRadius: theme.radius.l,
    backgroundColor: theme.border.default,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing.m,
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: theme.radius.s,
    backgroundColor: theme.text.brand,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: theme.radius.s,
    borderWidth: 1,
    borderColor: theme.border.strong,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    gap: theme.spacing.l,
  },

  noteText: {
    ...theme.typography.body,
    color: theme.text.primary,
  },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
  },
  tagPill: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
  },
  tagLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.onColor,
  },

  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    backgroundColor: theme.surface.brandSubtle,
    borderWidth: 1,
    borderColor: theme.border.brand,
    borderRadius: theme.radius.l,
    padding: theme.spacing.m,
  },
  highlightPhoto: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.m,
    backgroundColor: theme.border.brand,
    flexShrink: 0,
  },
  highlightBody: {
    flex: 1,
    gap: 4,
  },
  highlightHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  highlightHeading: {
    ...theme.typography.h4,
    color: theme.text.primary,
  },
  highlightTitle: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
});
