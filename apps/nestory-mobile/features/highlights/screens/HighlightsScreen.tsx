import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Highlight, Subscription, SubscriptionStatus, TopNotifyKind } from '@nestory/types';
import { theme } from '@/shared/theme';
import { TopNotify, type TopNotifyStatus } from '@/shared/components/TopNotify';
import { PaywallModal } from '@/shared/components/PaywallModal';
import { useChildren, useHighlights, useSubscription } from '@/api';

// Compute the correct HL-01 topNotify scenario.
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

function notifyKindFor(sub: SubscriptionStatus): TopNotifyKind {
  return sub === 'trial_ended' ? 'trial' : 'premium';
}

function formatShortDate(capturedAt: string): string {
  return new Date(capturedAt).toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

function headerSubtitle(count: number, limit: number | null): string {
  if (limit == null) return `${count} highlight${count !== 1 ? 's' : ''}`;
  return `${count} / ${limit} used`;
}

const COVER_H: Record<'portrait' | 'landscape', number> = {
  portrait:  228,
  landscape: 128,
};

function pickCoverUrl(item: Highlight): string | null {
  if (item.renderedImageUrl) return item.renderedImageUrl;
  return item.asset.fileUrls[0] ?? null;
}

function HighlightCard({ item, onPress }: { item: Highlight; onPress: () => void }) {
  const coverUrl = pickCoverUrl(item);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardCover, { height: COVER_H[item.coverOrientation] }]}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cardCoverImg} resizeMode="cover" />
        ) : null}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title ?? '—'}</Text>
        <Text style={styles.cardDate}>{formatShortDate(item.asset.capturedAt)}</Text>
      </View>
    </Pressable>
  );
}

export function HighlightsScreen() {
  const router = useRouter();
  const childrenQ = useChildren();
  const subQ      = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const children = childrenQ.data ?? [];
  const activeChildId =
    children.find(c => c.isActive)?.id ?? children[0]?.id ?? '';
  const highlightsQ = useHighlights({ childId: activeChildId || undefined });

  const sub: Subscription | undefined = subQ.data;
  const items = highlightsQ.data?.data ?? [];

  const count = sub?.highlightCount ?? items.length;
  const limit = sub?.highlightLimit ?? null;
  const hlNotifyStatus = sub
    ? getHlNotifyStatus(sub.subscriptionStatus, count, limit)
    : null;
  const subKind: TopNotifyKind = sub ? notifyKindFor(sub.subscriptionStatus) : 'premium';

  const leftItems  = items.filter((_, i) => i % 2 === 0);
  const rightItems = items.filter((_, i) => i % 2 !== 0);

  const isLoading = highlightsQ.isLoading || subQ.isLoading || childrenQ.isLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Highlights</Text>
        <Text style={styles.headerSubtitle}>{headerSubtitle(count, limit)}</Text>
      </View>

      {hlNotifyStatus != null && (
        <View style={styles.notifyWrap}>
          <TopNotify
            type={hlNotifyStatus}
            kind={subKind}
            onPress={() => setPaywallVisible(true)}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : highlightsQ.isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyBody}>Failed to load highlights.</Text>
          <Pressable onPress={() => highlightsQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconChar}>★</Text></View>
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
            <View style={styles.col}>
              {leftItems.map(item => (
                <HighlightCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/highlight/${item.id}`)}
                />
              ))}
            </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },

  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.xs,
  },
  headerTitle: { ...theme.typography.h1, color: theme.text.primary },
  headerSubtitle: { ...theme.typography.caption, color: theme.text.secondary },

  notifyWrap: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
  },

  scroll: { flex: 1 },
  gridWrap: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
  },
  grid: { flexDirection: 'row', gap: theme.spacing.m },
  col: { flex: 1, gap: theme.spacing.m },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  retryText: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

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
  emptyIconChar: { fontSize: 32, color: theme.text.brand },
  emptyTitle: { ...theme.typography.h2, color: theme.text.primary, textAlign: 'center' },
  emptyBody: { ...theme.typography.body, color: theme.text.secondary, textAlign: 'center' },

  card: {
    borderRadius: theme.radius.m,
    borderWidth: 1,
    borderColor: theme.border.default,
    backgroundColor: theme.surface.card,
    overflow: 'hidden',
  },
  cardCover: {
    width: '100%',
    backgroundColor: theme.border.default,
  },
  cardCoverImg: {
    width: '100%',
    height: '100%',
  },
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
