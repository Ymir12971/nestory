import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';
import { TopNotify, type TopNotifyStatus } from '@/shared/components/TopNotify';
import { PaywallModal } from '@/shared/components/PaywallModal';

// ---------- Types (mirrors @nestory/types Highlight) ----------

interface HighlightItem {
  id: string;
  coverOrientation: 'portrait' | 'landscape';
  title: string | null;
  asset: { capturedAt: string };
}

// ---------- Mock data — replace with GET /highlights?child_id=:id ----------

const MOCK_HIGHLIGHTS: HighlightItem[] = [
  { id: 'hl-1', coverOrientation: 'portrait',  title: 'Her First Steps!',              asset: { capturedAt: '2026-03-15T14:30:00+08:00' } },
  { id: 'hl-2', coverOrientation: 'landscape', title: 'Laughing at the ducks',         asset: { capturedAt: '2026-03-12T11:00:00+08:00' } },
  { id: 'hl-3', coverOrientation: 'portrait',  title: 'First mango — priceless face',  asset: { capturedAt: '2026-03-10T09:20:00+08:00' } },
  { id: 'hl-4', coverOrientation: 'landscape', title: 'Bath time splash',              asset: { capturedAt: '2026-03-08T19:15:00+08:00' } },
  { id: 'hl-5', coverOrientation: 'portrait',  title: 'Said "mama" for the second time', asset: { capturedAt: '2026-03-05T14:30:00+08:00' } },
  { id: 'hl-6', coverOrientation: 'landscape', title: 'Stair climber',                 asset: { capturedAt: '2026-02-28T10:00:00+08:00' } },
  { id: 'hl-7', coverOrientation: 'portrait',  title: 'Park adventure',                asset: { capturedAt: '2026-02-20T15:45:00+08:00' } },
];

// TODO: derive from GET /subscriptions/me — highlightCount + highlightLimit
const MOCK_HIGHLIGHT_COUNT = 7;
const MOCK_HIGHLIGHT_LIMIT: number | null = 10; // null for Premium users

// TODO: derive from GET /subscriptions/me — subscriptionStatus + kind
import type { SubscriptionStatus, TopNotifyKind } from '@nestory/types';
const MOCK_SUB_STATUS: SubscriptionStatus = 'never_paid';
const MOCK_SUB_KIND: TopNotifyKind = 'premium';

// Compute the correct HL-01 topNotify scenario
// Priority: ④ > ③ > ② > ① per StateMatrix §2.7.4
function getHlNotifyStatus(
  sub: SubscriptionStatus,
  count: number,
  limit: number | null,
): TopNotifyStatus | null {
  if (sub === 'premium_active' || sub === 'trial_active' || limit == null) return null;
  const isEnded = sub === 'trial_ended' || sub === 'premium_ended';
  if (isEnded) {
    if (count > limit)  return 'hl_ended_over_limit';
    if (count >= limit) return 'hl_ended_at_limit';
    return 'hl_ended_under_limit';
  }
  if (sub === 'never_paid' && count >= limit) return 'hl_free_at_limit';
  return null;
}

// ---------- Helpers ----------

function formatShortDate(capturedAt: string): string {
  const date = new Date(capturedAt);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric' }); // "Mar 15"
}

function headerSubtitle(count: number, limit: number | null): string {
  if (limit == null) return `${count} highlight${count !== 1 ? 's' : ''}`;
  return `${count} / ${limit} used`;
}

// ---------- Card heights per orientation ----------

const COVER_H: Record<'portrait' | 'landscape', number> = {
  portrait:  228, // 3:4
  landscape: 128, // 4:3
};

// ---------- HighlightCard ----------

function HighlightCard({
  item,
  onPress,
}: {
  item: HighlightItem;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Cover image */}
      <View style={[styles.cardCover, { height: COVER_H[item.coverOrientation] }]}>
        {/* TODO: replace with <Image source={{ uri: item.renderedImageUrl ?? fileUrls[0] }} resizeMode="cover" /> */}
      </View>
      {/* Card info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title ?? '—'}
        </Text>
        <Text style={styles.cardDate}>{formatShortDate(item.asset.capturedAt)}</Text>
      </View>
    </Pressable>
  );
}

// ---------- Screen ----------

export function HighlightsScreen() {
  const router = useRouter();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const hlNotifyStatus = getHlNotifyStatus(
    MOCK_SUB_STATUS,
    MOCK_HIGHLIGHT_COUNT,
    MOCK_HIGHLIGHT_LIMIT,
  );

  // Split into two columns: left = even indices, right = odd indices (newest first)
  const leftItems  = MOCK_HIGHLIGHTS.filter((_, i) => i % 2 === 0);
  const rightItems = MOCK_HIGHLIGHTS.filter((_, i) => i % 2 !== 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Highlights</Text>
        <Text style={styles.headerSubtitle}>
          {headerSubtitle(MOCK_HIGHLIGHT_COUNT, MOCK_HIGHLIGHT_LIMIT)}
        </Text>
      </View>

      {/* HL-01 / topNotify — Paywall B — 4 scenarios per StateMatrix §2.7.4 */}
      {hlNotifyStatus != null && (
        <View style={styles.notifyWrap}>
          <TopNotify
            type={hlNotifyStatus}
            kind={MOCK_SUB_KIND}
            onPress={() => setPaywallVisible(true)}
          />
        </View>
      )}

      {/* Waterfall grid OR empty state */}
      {MOCK_HIGHLIGHTS.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconChar}>★</Text>
          </View>
          <Text style={styles.emptyTitle}>No highlights yet</Text>
          <Text style={styles.emptyBody}>
            Mark a memory as a highlight to start your favorites collection.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.gridWrap}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {/* Left column */}
            <View style={styles.col}>
              {leftItems.map(item => (
                <HighlightCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/highlight/${item.id}`)}
                />
              ))}
            </View>
            {/* Right column */}
            <View style={styles.col}>
              {rightItems.map(item => (
                <HighlightCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/highlight/${item.id}`)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <PaywallModal
        visible={paywallVisible}
        variant="B"
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

  // Header — pt-16, pb-12, px-20, gap-4
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.text.primary,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },

  // topNotify
  notifyWrap: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
  },

  // Grid
  scroll: { flex: 1 },
  gridWrap: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
  },
  grid: {
    flexDirection: 'row',
    gap: theme.spacing.m,
  },
  col: {
    flex: 1,
    gap: theme.spacing.m,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.m,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconChar: {
    fontSize: 32,
    color: theme.text.brand,
  },
  emptyTitle: {
    ...theme.typography.h2,
    color: theme.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    ...theme.typography.body,
    color: theme.text.secondary,
    textAlign: 'center',
  },

  // Card — rounded-10, border default, surface.card, overflow-clip
  card: {
    borderRadius: theme.radius.m,
    borderWidth: 1,
    borderColor: theme.border.default,
    backgroundColor: theme.surface.card,
    overflow: 'hidden',
  },
  cardCover: {
    width: '100%',
    backgroundColor: theme.border.default, // neutral/200 #ededed
  },
  // hlInfo: px-8, py-10, gap-4
  cardInfo: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 10,
    gap: theme.spacing.xs,
  },
  cardTitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 16,
    color: theme.text.primary,
  },
  cardDate: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: theme.text.hint,
  },
});
