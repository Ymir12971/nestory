import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type MockMemory = {
  id: string;
  text: string;
  time: string;
  photoCount: number;
};

type DayGroup = {
  dayNum: string;
  monthAbbr: string;
  memories: MockMemory[];
};

// TODO: replace with real API data from GET /assets?childId=&month=YYYY-MM
const MOCK_GROUPS: DayGroup[] = [
  {
    dayNum: '15',
    monthAbbr: 'Mar',
    memories: [
      { id: '1', text: 'Emma laughed at the ducks at the park today. She kept pointing and saying "quack".', time: '5:34 PM', photoCount: 3 },
      { id: '2', text: 'First time eating mango. Made the funniest face!', time: '12:01 PM', photoCount: 1 },
    ],
  },
  {
    dayNum: '12',
    monthAbbr: 'Mar',
    memories: [
      { id: '3', text: 'Tried crawling up the stairs for the very first time. So determined!', time: '10:22 AM', photoCount: 2 },
    ],
  },
  {
    dayNum: '8',
    monthAbbr: 'Mar',
    memories: [
      { id: '4', text: 'Bath time splashing. Soaked the whole bathroom floor.', time: '7:15 PM', photoCount: 4 },
      { id: '5', text: 'Said "mama" clearly for the second time.', time: '2:30 PM', photoCount: 1 },
    ],
  },
];

export function MemoryListScreen() {
  const router = useRouter();
  const [selectedYear, setSelectedYear]   = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(3); // 1-indexed

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Memories</Text>
        <View style={styles.navSpacer} />
      </View>

      {/* Filter bar: year selector + month pills */}
      <View style={styles.filterBar}>
        <Pressable style={styles.yearSelector} onPress={() => { /* TODO: year picker sheet */ }}>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <RemixIcon name="arrow-down-s-line" size={18} color={theme.text.primary} />
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthPills}
        >
          {MONTH_LABELS.map((label, i) => {
            const monthNum = i + 1;
            const active   = monthNum === selectedMonth;
            return (
              <Pressable
                key={label}
                style={[styles.monthPill, active && styles.monthPillActive]}
                onPress={() => setSelectedMonth(monthNum)}
              >
                <Text style={[styles.monthPillLabel, active && styles.monthPillLabelActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Timeline */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_GROUPS.map((group, groupIndex) => (
          <View key={`${group.dayNum}-${group.monthAbbr}`} style={styles.dayGroup}>
            {/* Left: date badge + connector line */}
            <View style={styles.timelineLeft}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeDay}>{group.dayNum}</Text>
                <Text style={styles.dateBadgeMonth}>{group.monthAbbr}</Text>
              </View>
              {/* Connector line shown between groups, not after the last one */}
              {groupIndex < MOCK_GROUPS.length - 1 && (
                <View style={styles.connectorLine} />
              )}
            </View>

            {/* Right: memory cards */}
            <View style={styles.dayCards}>
              {group.memories.map((memory, cardIndex) => (
                <Pressable
                  key={memory.id}
                  style={[
                    styles.memoryCard,
                    cardIndex < group.memories.length - 1 && styles.memoryCardGap,
                  ]}
                  onPress={() => router.push(`/memory/${memory.id}`)}
                >
                  <View style={styles.cardPhotoWrap}>
                    {/* TODO: replace with <Image source={{ uri: memory.fileUrl }} /> */}
                    <View style={styles.cardPhotoPlaceholder} />
                    {memory.photoCount > 1 && (
                      <View style={styles.photoBadge}>
                        <RemixIcon name="image-line" size={10} color={theme.text.onColor} />
                        <Text style={styles.photoBadgeCount}>{memory.photoCount}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardText} numberOfLines={2}>{memory.text}</Text>
                    <Text style={styles.cardTime}>{memory.time}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const DATE_BADGE_W = 35;
const CARD_PHOTO   = 72;
const CARD_H       = 92;

const styles = StyleSheet.create({
  container: {
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
  navSpacer: { width: 24 },

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
    gap: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.default,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  yearText: {
    ...theme.typography.h3,
    color: theme.text.primary,
  },
  monthPills: {
    gap: theme.spacing.s,
    paddingRight: theme.spacing.xl,
  },
  monthPill: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.brand,
    backgroundColor: theme.surface.card,
  },
  monthPillActive: {
    backgroundColor: theme.surface.brand,
    borderColor: theme.surface.brand,
  },
  monthPillLabel: {
    ...theme.typography.caption,
    color: theme.text.brand,
  },
  monthPillLabelActive: {
    color: theme.text.onColor,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.safeBtm,
  },

  // Day group
  dayGroup: {
    flexDirection: 'row',
    gap: theme.spacing.m,
    marginBottom: theme.spacing.l,
  },

  // Timeline left column
  timelineLeft: {
    width: DATE_BADGE_W,
    alignItems: 'center',
  },
  dateBadge: {
    width: DATE_BADGE_W,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.s,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
  },
  dateBadgeDay: {
    ...theme.typography.h2,
    color: theme.text.brand,
  },
  dateBadgeMonth: {
    ...theme.typography.caption,
    color: theme.text.brand,
  },
  connectorLine: {
    flex: 1,
    width: 2,
    marginTop: theme.spacing.xs,
    marginBottom: -theme.spacing.l,
    backgroundColor: theme.border.default,
  },

  // Day cards column
  dayCards: {
    flex: 1,
    gap: 0,
  },
  memoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CARD_H,
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.m,
    gap: theme.spacing.m,
  },
  memoryCardGap: {
    marginBottom: theme.spacing.s,
  },
  cardPhotoWrap: {
    width: CARD_PHOTO,
    height: CARD_PHOTO,
    borderRadius: theme.radius.s,
    overflow: 'hidden',
  },
  cardPhotoPlaceholder: {
    width: CARD_PHOTO,
    height: CARD_PHOTO,
    backgroundColor: theme.border.default,
  },
  photoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: theme.radius.s,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  photoBadgeCount: {
    ...theme.typography.tagBadge,
    color: theme.text.onColor,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardText: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  cardTime: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
});
