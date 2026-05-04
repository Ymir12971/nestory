import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import type { CurrentMonthStatus, StoryListItem, SubscriptionStatus } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { TopNotify, type TopNotifyStatus } from '@/shared/components/TopNotify';
import { PaywallModal } from '@/shared/components/PaywallModal';
import { useChildren, useStories, useSubscription } from '@/api';

function topNotifyForSub(sub: SubscriptionStatus): TopNotifyStatus | null {
  if (sub === 'trial_ended')   return 'stories_trial_ended';
  if (sub === 'premium_ended') return 'stories_premium_ended';
  return null;
}

function notifyKindFor(sub: SubscriptionStatus): 'trial' | 'premium' {
  return sub === 'trial_ended' ? 'trial' : 'premium';
}

// ---------- Helpers ----------

function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number) as [number, number];
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  return {
    full: `${monthName} ${year}`,
    badge: `${monthName.toUpperCase()} ${year}`,
    monthName,
  };
}

// ---------- Card sub-components ----------

function CollectingCard({
  data,
  onAddMemory,
}: {
  data: CurrentMonthStatus;
  onAddMemory: () => void;
}) {
  // TODO: use proper milestone-target calculation once design logic is confirmed
  const progress = Math.min(data.memoryCount / 15, 1);
  return (
    <View style={styles.cardCollecting}>
      <View style={styles.collectingInner}>
        <Text style={styles.collectingTitle}>Story in {data.daysUntilGeneration} days…</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.collectingCaption}>
          {data.memoryCount} {data.memoryCount === 1 ? 'memory' : 'memories'} so far — your story is starting to take shape.
        </Text>
      </View>
      <Pressable style={styles.addMemoryBtn} onPress={onAddMemory}>
        <RemixIcon name="add-line" size={20} color={theme.text.brand} />
        <Text style={styles.addMemoryBtnLabel}>Add Memory</Text>
      </Pressable>
    </View>
  );
}

function GeneratingCard({ monthKey }: { monthKey: string }) {
  const { full } = parseMonthKey(monthKey);
  return (
    <View style={styles.cardGenerating}>
      <View style={styles.genArea}>
        <RemixIcon name="loader-2-line" size={48} color={theme.text.brand} />
        <Text style={styles.genAreaTitle}>Generating your Story…</Text>
      </View>
      <View style={styles.genBody}>
        <Text style={styles.cardTitle}>{full}</Text>
        <Text style={styles.collectingCaption}>Your Story is on its way — sit tight!</Text>
      </View>
    </View>
  );
}

function LockedCard({ onUpgrade }: { onUpgrade: () => void }) {
  // Paywall target: Modal · Paywall · A — see docs/W2-Nestory_StateMatrix_v1.0.md §2.7.7
  return (
    <View style={styles.cardLocked}>
      <View style={styles.lockedContent}>
        <RemixIcon name="lock-line" size={24} color={theme.text.hint} />
        <Text style={styles.lockedBody}>
          {"You've used your 2 free Stories. Upgrade to keep recording every month."}
        </Text>
      </View>
      <Pressable onPress={onUpgrade}>
        <View style={styles.upgradeCta}>
          <Text style={styles.upgradeCtaLabel}>Upgrade to Premium →</Text>
        </View>
      </Pressable>
    </View>
  );
}

function GeneratedCard({
  item,
  onPress,
}: {
  item: StoryListItem;
  onPress: () => void;
}) {
  const { badge } = parseMonthKey(item.monthKey);
  return (
    <Pressable style={styles.cardGenerated} onPress={onPress}>
      <View style={styles.coverArea}>
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
        <View style={styles.monthBadge}>
          <Text style={styles.monthBadgeLabel}>{badge}</Text>
        </View>
      </View>
      <View style={styles.generatedBody}>
        <View style={styles.generatedTextGroup}>
          <Text style={styles.cardTitle}>{item.title ?? '—'}</Text>
        </View>
        <View style={styles.cardFooter}>
          {item.memoryCount != null && (
            <Text style={styles.nsCaption}>{item.memoryCount} memories</Text>
          )}
          <View style={{ flex: 1 }} />
          <RemixIcon name="arrow-right-s-line" size={24} color={theme.text.secondary} />
        </View>
      </View>
    </Pressable>
  );
}

function NotGeneratedCard({ item }: { item: StoryListItem }) {
  const { full, monthName } = parseMonthKey(item.monthKey);
  return (
    <View style={styles.cardNotGenerated}>
      <View style={styles.nsImgArea}>
        <RemixIcon name="link-unlink-m" size={48} color={theme.text.hint} />
      </View>
      <View style={styles.nsBody}>
        <View style={styles.nsTextGroup}>
          <Text style={styles.cardTitle}>{full}</Text>
          <Text style={styles.nsCaption}>No Story was created for {monthName}.</Text>
        </View>
        <Text style={styles.nsDesc}>
          Add a few moments next month and we'll bring your Story to life.
        </Text>
      </View>
    </View>
  );
}

// ---------- Screen ----------

export function StoriesScreen() {
  const router = useRouter();
  const childrenQ = useChildren();
  const subQ      = useSubscription();
  const thisYear  = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(thisYear);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallVariant, setPaywallVariant] = useState<'A' | 'C'>('A');

  const openPaywall = (variant: 'A' | 'C') => {
    setPaywallVariant(variant);
    setPaywallVisible(true);
  };

  const children = childrenQ.data ?? [];
  const activeChildId =
    children.find(c => c.isActive)?.id ?? children[0]?.id ?? '';
  const storiesQ = useStories({ childId: activeChildId, year: selectedYear });

  // Available years: this year + the user's child birth year; collapse duplicates.
  const availableYears = useMemo(() => {
    const years = new Set<number>([thisYear]);
    for (const c of children) {
      const y = new Date(c.birthDate).getFullYear();
      if (Number.isFinite(y)) years.add(y);
    }
    return [...years].sort((a, b) => b - a);
  }, [children, thisYear]);

  const subStatus = subQ.data?.subscriptionStatus;
  const notifyType = subStatus ? topNotifyForSub(subStatus) : null;

  const isLoading = childrenQ.isLoading || storiesQ.isLoading;
  const isError   = childrenQ.isError || storiesQ.isError;
  const current   = storiesQ.data?.currentMonth;
  const historical = storiesQ.data?.historical ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stories</Text>
        <Text style={styles.headerSubtitle}>Your little one's growth, told by AI</Text>
      </View>

      <View style={styles.filterWrap}>
        <View style={styles.filterBar}>
          {availableYears.map(year => {
            const active = year === selectedYear;
            return (
              <Pressable
                key={year}
                style={[styles.yearPill, active && styles.yearPillActive]}
                onPress={() => setSelectedYear(year)}
              >
                <Text style={[styles.yearPillLabel, active && styles.yearPillLabelActive]}>
                  {year}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {notifyType != null && subStatus && (
        <View style={styles.notifyWrap}>
          <TopNotify
            type={notifyType}
            kind={notifyKindFor(subStatus)}
            onPress={() => openPaywall('C')}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Failed to load stories.</Text>
          <Pressable onPress={() => storiesQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {current?.listItemState === 'current_collecting' && (
            <CollectingCard
              data={current}
              onAddMemory={() => router.push('/memory/add')}
            />
          )}
          {current?.listItemState === 'current_in_progress' && (
            <GeneratingCard monthKey={current.monthKey} />
          )}
          {current?.listItemState === 'current_quota_exhausted' && (
            <LockedCard onUpgrade={() => openPaywall('A')} />
          )}

          {historical.map(item =>
            item.listItemState === 'historical_generated' && item.id ? (
              <GeneratedCard
                key={item.monthKey}
                item={item}
                onPress={() => router.push(`/story/${item.id}`)}
              />
            ) : (
              <NotGeneratedCard key={item.monthKey} item={item} />
            ),
          )}
        </ScrollView>
      )}

      <PaywallModal
        visible={paywallVisible}
        variant={paywallVariant}
        onSubscribe={() => setPaywallVisible(false)}
        onDismiss={() => setPaywallVisible(false)}
      />
    </SafeAreaView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

  // Header
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.s,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.text.primary,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },

  // Year filter
  filterWrap: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.m,
  },
  filterBar: {
    flexDirection: 'row',
    height: 36,
    backgroundColor: palette.primary[50],
    borderRadius: theme.radius.full,
    padding: 4,
    gap: theme.spacing.s,
  },
  yearPill: {
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.brand,
    backgroundColor: theme.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearPillActive: {
    backgroundColor: theme.surface.brand,
    borderColor: theme.surface.brand,
  },
  yearPillLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.brand,
  },
  yearPillLabelActive: {
    color: theme.text.onColor,
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

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.l,
  },

  // Current/Collecting card — border 1.5px, p-16, gap-12
  cardCollecting: {
    backgroundColor: theme.surface.card,
    borderWidth: 1.5,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    padding: theme.spacing.l,
    gap: theme.spacing.m,
  },
  collectingInner: {
    gap: theme.spacing.s,
  },
  collectingTitle: {
    ...theme.typography.h3,
    color: theme.text.success,
  },
  progressTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: palette.primary[100],
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 6,
    borderRadius: 6,
    backgroundColor: theme.surface.brand,
  },
  collectingCaption: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  addMemoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    minWidth: 140,
    paddingHorizontal: theme.spacing.l,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.brand,
    backgroundColor: theme.surface.default,
    gap: 4,
    alignSelf: 'flex-start',
  },
  addMemoryBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

  // topNotify wrap
  notifyWrap: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
  },

  // Generating card — border 1px, overflow-hidden, no padding at root
  cardGenerating: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    overflow: 'hidden',
  },
  genArea: {
    height: 140,
    backgroundColor: theme.surface.successSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  genAreaTitle: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
  genBody: {
    padding: theme.spacing.l,
    gap: 10,
  },

  // Locked card — surface.muted, border 1px, p-16, gap-12
  cardLocked: {
    backgroundColor: theme.surface.muted,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    padding: theme.spacing.l,
    gap: 12,
  },
  lockedContent: {
    gap: 12,
  },
  lockedBody: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  upgradeCta: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeCtaLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    lineHeight: 16,
    color: theme.text.premium,
  },

  // History/Generated card — border 1px, overflow-clip
  cardGenerated: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    overflow: 'hidden',
  },
  coverArea: {
    height: 198,
    backgroundColor: theme.surface.brandSubtle,
  },
  coverPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.surface.brandSubtle,
  },
  monthBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  monthBadgeLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.onColor,
  },
  generatedBody: {
    padding: theme.spacing.l,
    gap: theme.spacing.m,
  },
  generatedTextGroup: {
    gap: theme.spacing.s,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  // History/NotGenerated card — border 1px, overflow-clip
  cardNotGenerated: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    overflow: 'hidden',
  },
  nsImgArea: {
    height: 100,
    backgroundColor: theme.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nsBody: {
    padding: theme.spacing.l,
    gap: theme.spacing.m,
  },
  nsTextGroup: {
    gap: 6,
  },
  nsCaption: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  nsDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: theme.text.secondary,
  },
});
