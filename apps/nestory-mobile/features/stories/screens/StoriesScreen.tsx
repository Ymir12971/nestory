import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { Modal } from 'react-native';
import type { CurrentMonthStatus, StoryListItem } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { PaywallModal } from '@/shared/components/PaywallModal';
import { AddMemoryEntrySheet } from '@/shared/components/AddMemoryEntrySheet';
import { useAssetMonths, useChildren, useStories, useSubscription, useGenerateStoryNow } from '@/api';
import { showToast } from '@/features/ui/toast';
import { track } from '@/shared/lib/analytics';

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
  onGenerateNow,
  generating,
}: {
  data: CurrentMonthStatus;
  onAddMemory: () => void;
  onGenerateNow: () => void;
  generating: boolean;
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
      <View style={styles.collectingActions}>
        <Pressable style={styles.addMemoryBtn} onPress={onAddMemory}>
          <RemixIcon name="add-line" size={20} color={theme.text.brand} />
          <Text style={styles.addMemoryBtnLabel}>Add Memory</Text>
        </Pressable>
        <Pressable
          style={[styles.generateNowBtn, generating && { opacity: 0.6 }]}
          onPress={onGenerateNow}
          disabled={generating}
        >
          <RemixIcon name="magic-line" size={18} color={theme.text.onColor} />
          <Text style={styles.generateNowBtnLabel}>
            {generating ? 'Generating…' : 'Generate Now'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CurrentGeneratedCard({
  data,
  onPress,
}: {
  data: CurrentMonthStatus;
  onPress: () => void;
}) {
  const { badge } = parseMonthKey(data.monthKey);
  return (
    <Pressable style={styles.cardGenerated} onPress={onPress}>
      <View style={styles.coverArea}>
        {data.coverImageUrl ? (
          <Image source={{ uri: data.coverImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
        <View style={styles.monthBadge}>
          <Text style={styles.monthBadgeLabel}>{badge}</Text>
        </View>
      </View>
      <View style={styles.generatedBody}>
        <View style={styles.generatedTextGroup}>
          <Text style={styles.cardTitle}>{data.title ?? '—'}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.nsCaption}>{data.memoryCount} memories</Text>
          <View style={{ flex: 1 }} />
          <RemixIcon name="arrow-right-s-line" size={24} color={theme.text.secondary} />
        </View>
      </View>
    </Pressable>
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

/** Amber quota banner (DS Property=Locked) — persistent while free & out of stories. */
function LockedCard({ childName, onUpgrade }: { childName: string; onUpgrade: () => void }) {
  return (
    <View style={styles.cardLocked}>
      <View style={styles.lockedContent}>
        <RemixIcon name="lock-line" size={24} color={theme.text.hint} />
        <Text style={styles.lockedBody}>
          You've used your 2 free Stories. Upgrade to keep {childName}'s Stories going.
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
  onRegenerate,
}: {
  item: StoryListItem;
  onPress: () => void;
  onRegenerate?: () => void;
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
      {onRegenerate && <RegenerateStrip onPress={onRegenerate} />}
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

/** Blue "Memories changed" strip — Premium regenerate entry (DS AllowRegenerate). */
function RegenerateStrip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.regenStrip} onPress={onPress}>
      <Text style={styles.regenStripLabel}>Memories changed. Tap here to regenerate.</Text>
    </Pressable>
  );
}

/** NoMemories month card (DS Property=NoMemories). */
function NoMemoriesCard({ item, onRegenerate }: { item: StoryListItem; onRegenerate?: () => void }) {
  const { full } = parseMonthKey(item.monthKey);
  return (
    <View style={styles.cardNotGenerated}>
      <View style={styles.nsImgArea}>
        <RemixIcon name="link-unlink-m" size={48} color={theme.text.hint} />
        <Text style={styles.nsImgCaption}>No memories were added for this month.</Text>
      </View>
      {onRegenerate && <RegenerateStrip onPress={onRegenerate} />}
      <View style={styles.nsBody}>
        <View style={styles.nsTextGroup}>
          <Text style={styles.cardTitle}>{full}</Text>
        </View>
        <Text style={styles.nsDesc}>
          Add a few memories next month and we'll bring your Story to life.
        </Text>
      </View>
    </View>
  );
}

/** Folded "Story paused" card for consecutive subscription-gap months (DS NoPremium). */
function PausedCard({ startKey, endKey, kind }: { startKey: string; endKey: string; kind: 'Trial' | 'Premium' }) {
  const start = parseMonthKey(startKey);
  const end   = parseMonthKey(endKey);
  const range = startKey === endKey
    ? start.full
    : `${end.monthName} - ${start.full}`; // list is newest-first; display oldest → newest
  return (
    <View style={styles.cardNotGenerated}>
      <View style={styles.nsImgArea}>
        <RemixIcon name="lock-line" size={40} color={theme.text.hint} />
        <Text style={styles.nsImgCaption}>Story paused ({kind} ended)</Text>
      </View>
      <View style={styles.nsBody}>
        <Text style={styles.cardTitle}>{range}</Text>
      </View>
    </View>
  );
}

/** Premium-ended replacement for the current-month slot (Figma 731:3687). */
function PremiumEndedCard({ childName, onRenew }: { childName: string; onRenew: () => void }) {
  return (
    <View style={styles.cardLocked}>
      <View style={styles.lockedContent}>
        <RemixIcon name="lock-line" size={24} color={theme.text.hint} />
        <Text style={styles.lockedBody}>
          Your Premium has ended. Renew to keep {childName}'s Stories going.
        </Text>
      </View>
      <Pressable style={({ pressed }) => [styles.renewWrap, pressed && { opacity: 0.88 }]} onPress={onRenew}>
        <LinearGradient
          colors={[palette.accent[500], palette.accent[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.renewBtn}
        >
          <Text style={styles.renewLabel}>Renew Premium</Text>
        </LinearGradient>
      </Pressable>
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
  const [addEntryVisible, setAddEntryVisible] = useState(false);

  const openPaywall = () => setPaywallVisible(true);

  const children = childrenQ.data ?? [];
  const activeChild = children.find(c => c.isActive) ?? children[0];
  const activeChildId = activeChild?.id ?? '';
  const childName = activeChild?.name ?? 'your little one';
  const storiesQ = useStories({ childId: activeChildId, year: selectedYear });
  const monthsQ  = useAssetMonths(activeChildId);
  const generateNow = useGenerateStoryNow();
  // monthKey pending regenerate confirmation (S-Regeneration confirm popup)
  const [regenMonthKey, setRegenMonthKey] = useState<string | null>(null);

  const handleGenerateNow = async (monthKey?: string) => {
    if (!activeChildId || generateNow.isPending) return;
    try {
      const res = await generateNow.mutateAsync({
        childId: activeChildId,
        ...(monthKey ? { monthKey } : {}),
      });
      showToast({
        type: 'info',
        message: res.status === 'already_in_progress'
          ? 'Your Story is already on its way — give it a moment.'
          : 'Generating your Story… give it ~30 seconds, then pull to refresh.',
        duration: 5000,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Please try again.';
      showToast({ type: 'error', message: `Couldn't start generation: ${msg}` });
    }
  };

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
  const isPremium = subStatus === 'premium_active' || subStatus === 'trial_active';
  // New semantics (决策6): "Trial ended" = the 2 free stories are used up —
  // judged by the quota state, NOT the legacy trial_ended platform enum.
  const quotaExhausted = subStatus === 'trial_ended' ||
    storiesQ.data?.currentMonth.listItemState === 'current_quota_exhausted';
  const premiumEnded = subStatus === 'premium_ended';
  const pausedKind: 'Trial' | 'Premium' = premiumEnded ? 'Premium' : 'Trial';

  const isLoading = childrenQ.isLoading || storiesQ.isLoading;
  const isError   = childrenQ.isError || storiesQ.isError;
  const current   = storiesQ.data?.currentMonth;
  const historical = storiesQ.data?.historical ?? [];

  // Months that actually have memories — splits "not generated" months into
  // Paused (had memories, no subscription/quota when the month closed) vs
  // NoMemories. Consecutive Paused months fold into one card (annotation).
  const monthsWithMemories = useMemo(
    () => new Set((monthsQ.data ?? []).map(m => m.monthKey)),
    [monthsQ.data],
  );
  type Row =
    | { kind: 'generated'; item: StoryListItem }
    | { kind: 'no_memories'; item: StoryListItem }
    | { kind: 'paused'; startKey: string; endKey: string };
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const item of historical) {
      if (item.listItemState === 'historical_generated' && item.id) {
        out.push({ kind: 'generated', item });
      } else if (item.canRegenerate) {
        // 生成失败但可补生成的月份:必须独立成卡(Paused 折叠卡没有重生成入口)
        out.push({ kind: 'no_memories', item });
      } else if (monthsWithMemories.has(item.monthKey)) {
        const last = out[out.length - 1];
        // list is newest-first: extend the fold's older edge (endKey)
        if (last?.kind === 'paused') last.endKey = item.monthKey;
        else out.push({ kind: 'paused', startKey: item.monthKey, endKey: item.monthKey });
      } else {
        out.push({ kind: 'no_memories', item });
      }
    }
    return out;
  }, [historical, monthsWithMemories]);

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

      {/* Persistent quota banner — free users out of stories (Locked variant) */}
      {quotaExhausted && !isLoading && (
        <View style={styles.notifyWrap}>
          <LockedCard childName={childName} onUpgrade={openPaywall} />
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : isError ? (
        // S-Stories couldn't load: pull down to refresh (annotation)
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={
            <RefreshControl refreshing={storiesQ.isRefetching} onRefresh={() => void storiesQ.refetch()} />
          }
        >
          <RemixIcon name="wifi-off-line" size={40} color={theme.text.hint} />
          <Text style={styles.emptyText}>Your Stories couldn't load.</Text>
          <Text style={styles.retryText}>Pull down to refresh</Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={storiesQ.isRefetching} onRefresh={() => void storiesQ.refetch()} />
          }
        >
          {/* Current-month slot. Premium-ended swaps in the Renew card; quota-
              exhausted shows nothing here (the persistent banner covers it). */}
          {premiumEnded ? (
            <PremiumEndedCard childName={childName} onRenew={openPaywall} />
          ) : (
            <>
              {current?.listItemState === 'current_collecting' && !quotaExhausted && (
                <CollectingCard
                  data={current}
                  onAddMemory={() => setAddEntryVisible(true)}
                  onGenerateNow={() => void handleGenerateNow()}
                  generating={generateNow.isPending}
                />
              )}
              {current?.listItemState === 'current_in_progress' && (
                <GeneratingCard monthKey={current.monthKey} />
              )}
              {current?.listItemState === 'current_generated' && current.storyId && (
                <CurrentGeneratedCard
                  data={current}
                  onPress={() => router.push(`/story/${current.storyId}`)}
                />
              )}
            </>
          )}

          {rows.map(row => {
            if (row.kind === 'generated') {
              const canRegen = row.item.canRegenerate === true;
              return (
                <GeneratedCard
                  key={row.item.monthKey}
                  item={row.item}
                  onPress={() => router.push(`/story/${row.item.id}`)}
                  onRegenerate={canRegen ? () => setRegenMonthKey(row.item.monthKey) : undefined}
                />
              );
            }
            if (row.kind === 'paused') {
              return (
                <PausedCard
                  key={`paused-${row.startKey}`}
                  startKey={row.startKey}
                  endKey={row.endKey}
                  kind={pausedKind}
                />
              );
            }
            const canRegen = row.item.canRegenerate === true;
            return (
              <NoMemoriesCard
                key={row.item.monthKey}
                item={row.item}
                onRegenerate={canRegen ? () => setRegenMonthKey(row.item.monthKey) : undefined}
              />
            );
          })}
        </ScrollView>
      )}

      {/* Regenerate confirm popup — the new Story OVERWRITES the old one */}
      <Modal
        visible={regenMonthKey !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRegenMonthKey(null)}
      >
        <Pressable style={styles.regenScrim} onPress={() => setRegenMonthKey(null)} />
        <View style={styles.regenSheet}>
          <View style={styles.regenHandle} />
          <Text style={styles.regenTitle}>Regenerate this Story?</Text>
          <Text style={styles.regenBody}>
            We'll create a new Story from this month's updated memories. The new Story will replace the current one — this can't be undone.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.regenConfirmWrap, pressed && { opacity: 0.88 }]}
            onPress={() => {
              const key = regenMonthKey;
              setRegenMonthKey(null);
              if (key) {
                track('story_regenerated', { monthKey: key });
                void handleGenerateNow(key);
              }
            }}
          >
            <LinearGradient
              colors={[palette.primary[500], palette.primary[400]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.regenConfirmBtn}
            >
              <Text style={styles.regenConfirmLabel}>Confirm</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.regenCancelBtn} onPress={() => setRegenMonthKey(null)}>
            <Text style={styles.regenCancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>

      <PaywallModal
        visible={paywallVisible}
        onSubscribe={() => setPaywallVisible(false)}
        onDismiss={() => setPaywallVisible(false)}
      />

      <AddMemoryEntrySheet
        visible={addEntryVisible}
        onSelect={(entryMode) => {
          setAddEntryVisible(false);
          router.push(`/memory/add?mode=${entryMode}`);
        }}
        onDismiss={() => setAddEntryVisible(false)}
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
  collectingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
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
  },
  addMemoryBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
  generateNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: theme.spacing.l,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
    gap: 6,
  },
  generateNowBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
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
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.l,
  },
  nsImgCaption: {
    ...theme.typography.caption,
    color: theme.text.hint,
    textAlign: 'center',
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

  // Regenerate strip (DS AllowRegenerate — blue band)
  regenStrip: {
    backgroundColor: theme.surface.infoSubtle,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.l,
  },
  regenStripLabel: {
    ...theme.typography.caption,
    color: theme.text.info,
  },

  // Premium-ended renew button
  renewWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  renewBtn: {
    height: 44,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renewLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.premium,
  },

  // Regenerate confirm sheet
  regenScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  regenSheet: {
    backgroundColor: theme.surface.card,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm + theme.spacing.l,
    gap: theme.spacing.m,
  },
  regenHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border.strong,
    alignSelf: 'center',
    marginBottom: theme.spacing.s,
  },
  regenTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: theme.text.primary,
  },
  regenBody: {
    ...theme.typography.body,
    color: theme.text.secondary,
    lineHeight: 22,
  },
  regenConfirmWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    marginTop: theme.spacing.s,
  },
  regenConfirmBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenConfirmLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  regenCancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenCancelLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.secondary,
  },
});
