import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';

const SCREEN_W = Dimensions.get('window').width;

const PHOTO_CENTER_W = 225;
const PHOTO_CENTER_H = 300;
const PHOTO_SIDE_W   = 195;
const PHOTO_SIDE_H   = 260;
const PHOTO_GAP      = 12;
const CAROUSEL_PADDING = (SCREEN_W - PHOTO_CENTER_W) / 2;
const CAROUSEL_INIT_X  = PHOTO_SIDE_W + PHOTO_GAP;

const DOTS_TOTAL = 6;

// TODO: replace with real data from GET /assets/:id
const MOCK_MEMORY = {
  id: '1',
  text: 'Emma laughed at the ducks at the park today. She kept pointing at them and saying "quack quack quack" over and over. I have never seen her this excited about animals before.',
  tags: ['Playtime', 'Park', 'First Time'],
  isHighlight: true,
  highlightTitle: 'Emma discovers ducks at the park',
  capturedAt: 'April 8, 2026 · 5:34 PM',
  isEditable: true,
};

export function MemoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Status bar spacer */}
      <View style={{ height: insets.top, backgroundColor: theme.surface.default }} />

      {/* NavBar — "Memory" title + absolute Edit button */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Memory</Text>
        {MOCK_MEMORY.isEditable ? (
          <Pressable hitSlop={8} onPress={() => router.push(`/memory/${MOCK_MEMORY.id}/edit`)}>
            <Text style={styles.editButton}>Edit</Text>
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={PHOTO_CENTER_W + PHOTO_GAP}
          decelerationRate="fast"
          contentOffset={{ x: CAROUSEL_INIT_X, y: 0 }}
          style={styles.carouselScroll}
          contentContainerStyle={[
            styles.carouselContent,
            { paddingHorizontal: CAROUSEL_PADDING },
          ]}
        >
          {/* TODO: replace with real memory photos */}
          <View style={[styles.photoSide, { marginRight: PHOTO_GAP }]} />
          <View style={[styles.photoCenter, { marginRight: PHOTO_GAP }]} />
          <View style={styles.photoSide} />
        </ScrollView>

        {/* Page dots */}
        <View style={styles.dots}>
          {Array.from({ length: DOTS_TOTAL }).map((_, i) => (
            <View key={i} style={i === 0 ? styles.dotActive : styles.dotInactive} />
          ))}
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Full text note */}
          <Text style={styles.noteText}>{MOCK_MEMORY.text}</Text>

          {/* Tags row */}
          {MOCK_MEMORY.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {MOCK_MEMORY.tags.map(tag => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagLabel}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Highlight card — only when is_highlight=true */}
          {MOCK_MEMORY.isHighlight && (
            <Pressable
              style={styles.highlightCard}
              onPress={() => router.push('/highlights/1')}
            >
              {/* Cover photo thumbnail */}
              <View style={styles.highlightPhoto} />

              {/* Right content */}
              <View style={styles.highlightBody}>
                <RemixIcon name="star-fill" size={20} color={theme.text.brand} />
                <Text style={styles.highlightHeading}>Marked as a highlight</Text>
                {MOCK_MEMORY.highlightTitle ? (
                  <Text style={styles.highlightTitle} numberOfLines={2}>
                    {MOCK_MEMORY.highlightTitle}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}

          {/* Timestamp meta */}
          <View style={styles.metaRow}>
            <RemixIcon name="time-line" size={16} color={theme.text.secondary} />
            <Text style={styles.metaText}>{MOCK_MEMORY.capturedAt}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom safe area */}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

  // NavBar
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

  // Carousel
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

  // Scroll + Body
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

  // Tags
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

  // Highlight card
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
    borderRadius: theme.radius.s,
    backgroundColor: theme.border.brand,
    flexShrink: 0,
  },
  highlightBody: {
    flex: 1,
    gap: 2,
  },
  highlightHeading: {
    ...theme.typography.h4,
    color: theme.text.primary,
  },
  highlightTitle: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },

  // Meta
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
