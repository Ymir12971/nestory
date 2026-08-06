import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import type { Moment } from '@nestory/types';
import { theme } from '@/shared/theme';
import { useAssetMonths, useAssets, useChildren } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DayGroup {
  key:       string;        // YYYY-MM-DD
  dayNum:    string;
  monthAbbr: string;
  moments:  Moment[];
}

function groupByDay(items: Moment[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const m of items) {
    const d = new Date(m.capturedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        dayNum:    String(d.getDate()),
        monthAbbr: MONTH_LABELS[d.getMonth()]!,
        moments:  [],
      };
      map.set(key, group);
    }
    group.moments.push(m);
  }
  // Newest day first; within a day, newest moment first (server already returns desc, but be safe).
  return [...map.values()]
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map(g => ({
      ...g,
      moments: [...g.moments].sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      ),
    }));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function MomentListScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const childrenQ = useChildren();
  const now = new Date();
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const children = childrenQ.data ?? [];
  const activeChild = children.find(c => c.isActive) ?? children[0];
  const activeChildId = activeChild?.id ?? '';
  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Redesign filter rules (H-First Moment / Normal list annotations):
  // months shown = months that HAVE moments + the current month (always),
  // newest first (current month leftmost); gap months are hidden entirely,
  // so the timeline implicitly starts at the first moment's month.
  const monthsQ = useAssetMonths(activeChildId);
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const filterKeys = useMemo(() => {
    const keys = new Set<string>([currentKey]);
    for (const m of monthsQ.data ?? []) keys.add(m.monthKey);
    return [...keys].sort((a, b) => (a < b ? 1 : -1)); // DESC
  }, [monthsQ.data, currentKey]);

  const availableYears = useMemo(
    () => [...new Set(filterKeys.map(k => Number(k.slice(0, 4))))],
    [filterKeys],
  );
  const yearKeys = filterKeys.filter(k => Number(k.slice(0, 4)) === selectedYear);

  const assetsQ = useAssets({ childId: activeChildId, month: monthKey });
  const groups  = useMemo(() => groupByDay(assetsQ.data?.data ?? []), [assetsQ.data]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Moments</Text>
        <View style={styles.navSpacer} />
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <Pressable style={styles.yearSelector} onPress={() => setYearPickerVisible(true)}>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <RemixIcon name="arrow-down-s-line" size={24} color={theme.text.primary} />
        </Pressable>

        <View style={styles.filterDivider} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthPills}
        >
          {yearKeys.map((key) => {
            const monthNum = Number(key.slice(5, 7));
            const label    = MONTH_LABELS[monthNum - 1]!;
            const active   = monthNum === selectedMonth;
            return (
              <Pressable
                key={key}
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

      {/* Body */}
      {assetsQ.isLoading || childrenQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : assetsQ.isError ? (
        // H-Moments couldn't load: pull down to refresh (annotation)
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={
            <RefreshControl refreshing={assetsQ.isRefetching} onRefresh={() => void assetsQ.refetch()} />
          }
        >
          <Text style={styles.emptyText}>Your moments couldn't load.</Text>
          <Text style={styles.retryText}>Pull down to refresh</Text>
        </ScrollView>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No moments this month yet.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={assetsQ.isRefetching} onRefresh={() => void assetsQ.refetch()} />
          }
        >
          {groups.map((group, groupIndex) => (
            <View key={group.key} style={styles.dayGroup}>
              <View style={styles.timelineLeft}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeDay}>{group.dayNum}</Text>
                  <Text style={styles.dateBadgeMonth}>{group.monthAbbr}</Text>
                </View>
                {groupIndex < groups.length - 1 && <View style={styles.connectorLine} />}
              </View>

              <View style={styles.dayCards}>
                {group.moments.map((moment, cardIndex) => {
                  const cover = moment.files[0];
                  const photoCount = moment.files.length;
                  return (
                    <Pressable
                      key={moment.id}
                      style={[
                        styles.momentCard,
                        cardIndex < group.moments.length - 1 && styles.momentCardGap,
                      ]}
                      onPress={() => router.push(`/moment/${moment.id}`)}
                    >
                      <View style={styles.cardPhotoWrap}>
                        {cover ? (
                          <Image source={{ uri: cover.fileUrl }} style={styles.cardPhotoImg} />
                        ) : (
                          <View style={styles.cardPhotoPlaceholder} />
                        )}
                        {photoCount > 1 && (
                          <View style={styles.photoBadge}>
                            <RemixIcon name="image-line" size={10} color={theme.text.onColor} />
                            <Text style={styles.photoBadgeCount}>{photoCount}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardText} numberOfLines={2}>
                          {moment.textNote ?? '(no caption)'}
                        </Text>
                        <Text style={styles.cardTime}>{formatTime(moment.capturedAt)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Year picker sheet */}
      <Modal
        visible={yearPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setYearPickerVisible(false)}
      >
        <Pressable style={styles.sheetScrim} onPress={() => setYearPickerVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Year</Text>
          {availableYears.map((y, i) => (
            <Pressable
              key={y}
              style={styles.yearRow}
              onPress={() => {
                setSelectedYear(y);
                // Land on that year's newest visible month (pills are DESC).
                const first = filterKeys.find(k => Number(k.slice(0, 4)) === y);
                if (first) setSelectedMonth(Number(first.slice(5, 7)));
                setYearPickerVisible(false);
              }}
            >
              <Text style={[styles.yearRowLabel, y === selectedYear && styles.yearRowLabelActive]}>{y}</Text>
              {y === selectedYear && (
                <RemixIcon name="check-line" size={20} color={theme.text.brand} />
              )}
              {i < availableYears.length - 1 && <View style={styles.yearRowDivider} />}
            </Pressable>
          ))}
        </View>
      </Modal>
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

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.spacing.xl,
    paddingVertical: 4,
    gap: theme.spacing.m,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.border.default,
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

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.safeBtm,
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

  dayGroup: {
    flexDirection: 'row',
    gap: theme.spacing.m,
    marginBottom: theme.spacing.l,
  },

  timelineLeft: {
    width: DATE_BADGE_W,
    alignItems: 'center',
  },
  dateBadge: {
    width: DATE_BADGE_W,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.m,
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

  dayCards: {
    flex: 1,
    gap: 0,
  },
  momentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CARD_H,
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.m,
    gap: theme.spacing.m,
  },
  momentCardGap: {
    marginBottom: theme.spacing.s,
  },
  cardPhotoWrap: {
    width: CARD_PHOTO,
    height: CARD_PHOTO,
    borderRadius: theme.radius.m,
    overflow: 'hidden',
  },
  cardPhotoImg: {
    width: CARD_PHOTO,
    height: CARD_PHOTO,
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    lineHeight: 12,
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

  // Year picker sheet
  sheetScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: theme.surface.default,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm + theme.spacing.m,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border.strong,
    alignSelf: 'center',
    marginBottom: theme.spacing.m,
  },
  sheetTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
    marginBottom: theme.spacing.s,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.m,
  },
  yearRowLabel: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  yearRowLabelActive: {
    color: theme.text.brand,
    fontFamily: 'Manrope_600SemiBold',
  },
  yearRowDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: theme.border.default,
  },
});
