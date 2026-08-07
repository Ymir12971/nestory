import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { Modal } from 'react-native';
import type { CurrentMonthStatus, StoryListItem } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { Button } from '@/shared/components/Button';
import { PaywallModal } from '@/shared/components/PaywallModal';
import { AddMomentEntrySheet } from '@/shared/components/AddMomentEntrySheet';
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
  childName,
  onAddMoment,
  onGenerateNow,
  generating,
}: {
  data: CurrentMonthStatus;
  childName: string;
  onAddMoment: () => void;
  onGenerateNow: () => void;
  generating: boolean;
}) {
  // TODO: use proper milestone-target calculation once design logic is confirmed
  const progress = Math.min(data.momentCount / 15, 1);
  const { full, monthName } = parseMonthKey(data.monthKey);
  return (
    <View style={styles.cardCollecting}>
      <View style={styles.collectingInner}>
        {/* 744:3973 — "{child}'s {month} Story in N days …" */}
        <Text style={styles.collectingTitle}>
          {childName}'s {monthName} Story in {data.daysUntilGeneration} days …
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        {/* cgFooter 744:3975 — "{month} {year}  |  N moments" + chevron */}
        <View style={styles.cardFooter}>
          <Text style={styles.nsCaption}>
            {full}  |  {data.momentCount} {data.momentCount === 1 ? 'moment' : 'moments'}
          </Text>
          <RemixIcon name="arrow-right-s-line" size={24} color={theme.text.secondary} />
        </View>
      </View>
      <View style={styles.collectingActions}>
        <Pressable style={styles.addMomentBtn} onPress={onAddMoment}>
          <RemixIcon name="add-line" size={20} color={theme.text.brand} />
          <Text style={styles.addMomentBtnLabel}>Add Moment</Text>
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
          <Text style={styles.storyTitle}>{data.title ?? '—'}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.nsCaption}>{data.momentCount} moments</Text>
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
        {/* 744:3999 — two lines, per the design */}
        <Text style={styles.collectingCaption}>
          Turning this month's moments into a Story.{'\n'}It'll be worth the wait!
        </Text>
      </View>
    </View>
  );
}

/** Amber quota banner (DS Property=Locked) — persistent while free & out of stories. */
function LockedCard({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={styles.cardLocked}>
      <View style={styles.lockedContent}>
        <RemixIcon name="lock-line" size={24} color={theme.text.warning} />
        {/* 44:30 — the design's copy is generic, not name-personalised */}
        <Text style={styles.lockedBody}>
          You've used your 2 free Stories. Upgrade to keep recording every month.
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
          <Text style={styles.storyTitle}>{item.title ?? '—'}</Text>
        </View>
        <View style={styles.cardFooter}>
          {item.momentCount != null && (
            <Text style={styles.nsCaption}>{item.momentCount} moments</Text>
          )}
          <View style={{ flex: 1 }} />
          <RemixIcon name="arrow-right-s-line" size={24} color={theme.text.secondary} />
        </View>
      </View>
    </Pressable>
  );
}

/** Blue "Moments changed" strip — Premium regenerate entry (DS AllowRegenerate). */
function RegenerateStrip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.regenStrip} onPress={onPress}>
      <Text style={styles.regenStripLabel}>Moments changed. Tap here to regenerate.</Text>
    </Pressable>
  );
}

/** NoMoments month card (DS Property=NoMoments). */
function NoMomentsCard({ item, onRegenerate }: { item: StoryListItem; onRegenerate?: () => void }) {
  const { full } = parseMonthKey(item.monthKey);
  return (
    <View style={styles.cardNotGenerated}>
      <View style={styles.nsImgArea}>
        <RemixIcon name="link-unlink-m" size={48} color={theme.text.hint} />
        <Text style={styles.nsImgCaption}>No moments were added for this month.</Text>
      </View>
      {onRegenerate && <RegenerateStrip onPress={onRegenerate} />}
      <View style={styles.nsBody}>
        <View style={styles.nsTextGroup}>
          <Text style={styles.cardTitle}>{full}</Text>
        </View>
        <Text style={styles.nsDesc}>
          Add a few moments next month and we'll bring your Story to life.
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
        {/* 744:4883 — same 48px link-unlink glyph as the no-moments card */}
        <RemixIcon name="link-unlink-m" size={48} color={theme.text.secondary} />
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
      <Button label="Renew Premium" type="premium" style={styles.renewBtn} onPress={onRenew} />
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

  // Months that actually have moments — splits "not generated" months into
  // Paused (had moments, no subscription/quota when the month closed) vs
  // NoMoments. Consecutive Paused months fold into one card (annotation).
  const monthsWithMoments = useMemo(
    () => new Set((monthsQ.data ?? []).map(m => m.monthKey)),
    [monthsQ.data],
  );
  type Row =
    | { kind: 'generated'; item: StoryListItem }
    | { kind: 'no_moments'; item: StoryListItem }
    | { kind: 'paused'; startKey: string; endKey: string };
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const item of historical) {
      if (item.listItemState === 'historical_generated' && item.id) {
        out.push({ kind: 'generated', item });
      } else if (item.canRegenerate) {
        // 生成失败但可补生成的月份:必须独立成卡(Paused 折叠卡没有重生成入口)
        out.push({ kind: 'no_moments', item });
      } else if (monthsWithMoments.has(item.monthKey)) {
        const last = out[out.length - 1];
        // list is newest-first: extend the fold's older edge (endKey)
        if (last?.kind === 'paused') last.endKey = item.monthKey;
        else out.push({ kind: 'paused', startKey: item.monthKey, endKey: item.monthKey });
      } else {
        out.push({ kind: 'no_moments', item });
      }
    }
    return out;
  }, [historical, monthsWithMoments]);

  // First entry: nothing but the current month exists yet, so the page shows the
  // big headline + "how it works" explainer and hides the year filter
  // (S-Story Empty 821:1534).
  const noHistory = rows.length === 0;
  const monthLabel = current ? parseMonthKey(current.monthKey).monthName : '';
  const generationDayLabel = useMemo(() => {
    if (!current) return '';
    const [y, m] = current.monthKey.split('-').map(Number);
    if (!y || !m) return '';
    const lastDay = new Date(y, m, 0); // day 0 of next month = last of this one
    return lastDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }, [current?.monthKey]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Two header treatments: before any Story exists the page leads with a
          32px headline (S-Story Empty 821:1536); once there's history it
          shrinks to an 18px line over a hairline (S-Over one year 731:3338). */}
      {noHistory ? (
        <View style={styles.headerEmpty}>
          <Text style={styles.headerTitleEmpty}>
            {childName}'s growth, one <Text style={styles.headerTitleBrand}>Story</Text> a month
          </Text>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {childName}'s monthly <Text style={styles.headerTitleBrand}>Story</Text>
          </Text>
        </View>
      )}

      {/* The year filter only appears once there's history to filter */}
      {!noHistory && (
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
      )}

      {/* Persistent quota banner — free users out of stories (Locked variant) */}
      {quotaExhausted && !isLoading && (
        <View style={styles.notifyWrap}>
          <LockedCard onUpgrade={openPaywall} />
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : isError ? (
        // S-Stories couldn't load: pull down to refresh (annotation)
        <ScrollView
          contentContainerStyle={styles.abnormalWrap}
          refreshControl={
            <RefreshControl refreshing={storiesQ.isRefetching} onRefresh={() => void storiesQ.refetch()} />
          }
        >
          {/* DS Abnormal · Type=WebIssue, same block as H-Memories couldn't load */}
          <View style={styles.abnormal}>
            <RemixIcon name="wifi-off-line" size={48} color={theme.text.secondary} />
            <View style={styles.abnormalText}>
              <Text style={styles.abnormalTitle}>Stories couldn't load</Text>
              <Text style={styles.abnormalBody}>Check your connection and try again.</Text>
            </View>
          </View>
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
                  childName={childName}
                  onAddMoment={() => setAddEntryVisible(true)}
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
              <NoMomentsCard
                key={row.item.monthKey}
                item={row.item}
                onRegenerate={canRegen ? () => setRegenMonthKey(row.item.monthKey) : undefined}
              />
            );
          })}

          {/* 821:1540 — first-entry explainer under the collecting card */}
          {noHistory && (
            <View style={styles.explainer}>
              <View style={styles.explainerHead}>
                <View style={styles.explainerTile}>
                  <RemixIcon name="book-open-line" size={72} color={palette.primary[500]} />
                </View>
                <Text style={styles.explainerTitle}>How {childName}'s Story works</Text>
              </View>
              <View style={styles.explainerSteps}>
                <Text style={styles.explainerStep}>1.  Add Moments anytime during {monthLabel}</Text>
                <Text style={styles.explainerStep}>
                  2.  On {generationDayLabel}, AI writes {childName}'s Story.
                </Text>
              </View>
              <Text style={styles.explainerFootnote}>
                Stories are made from your Moments — none this month means no Story. Start with one
                today.
              </Text>
            </View>
          )}
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
          <Text style={styles.regenTitle}>You have to know</Text>
          <Text style={styles.regenBody}>
            The existing Story will be covered by the new one.{'\n'}
            {'\n'}
            Please confirm if you want to continue.
          </Text>
          <View style={styles.regenCta}>
            <Button
              label="Confirm"
              onPress={() => {
                const key = regenMonthKey;
                setRegenMonthKey(null);
                if (key) {
                  track('story_regenerated', { monthKey: key });
                  void handleGenerateNow(key);
                }
              }}
            />
            <Button
              label="Cancel"
              type="text"
              style={styles.regenCancelBtn}
              onPress={() => setRegenMonthKey(null)}
            />
          </View>
        </View>
      </Modal>

      <PaywallModal
        visible={paywallVisible}
        onSubscribe={() => setPaywallVisible(false)}
        onDismiss={() => setPaywallVisible(false)}
      />

      <AddMomentEntrySheet
        visible={addEntryVisible}
        onSelect={(entryMode) => {
          setAddEntryVisible(false);
          router.push(`/moment/add?mode=${entryMode}`);
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

  // DS Abnormal · Type=WebIssue (774:3808)
  abnormalWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
  },
  abnormal: {
    width: 300,
    alignItems: 'center',
    padding: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  abnormalText: { alignSelf: 'stretch', gap: theme.spacing.s },
  abnormalTitle: {
    ...theme.typography.body,
    color: theme.text.primary,
    textAlign: 'center',
  },
  abnormalBody: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },

  // header 821:1536 — first-entry headline, 32px Manrope Bold, no hairline
  headerEmpty: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
  },
  headerTitleEmpty: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
    lineHeight: 40,
    color: theme.text.primary,
  },

  // 821:1540 — "how it works" explainer, only on first entry
  explainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxl, // 24
    paddingTop: theme.spacing.s,
  },
  explainerHead: { width: 238, alignItems: 'center', gap: theme.spacing.s },
  explainerTile: {
    width: 128,
    height: 128,
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  explainerTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
    textAlign: 'center',
  },
  explainerSteps: { alignSelf: 'stretch', gap: theme.spacing.m, alignItems: 'center' },
  explainerStep: {
    ...theme.typography.body,
    color: theme.text.primary,
    textAlign: 'center',
  },
  explainerFootnote: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },

  // header 731:3338 — px20 / py16 with a border/default hairline below
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.default,
  },
  // 731:3340 — Manrope *Regular* 18/24, with "Story" in brand green
  headerTitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 18,
    lineHeight: 24,
    color: theme.text.primary,
  },
  headerTitleBrand: { color: theme.text.brand },

  // Year filter
  filterWrap: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.m,
  },
  // Filter 731:3421 — bare 36-tall row of pills, no tinted track
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.s,
  },
  yearPill: {
    paddingHorizontal: theme.spacing.l, // 16 — wider than the Home month pills
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

  // StoryCard Property=Collecting (744:4019) — brand-subtle fill behind a
  // 1.5px brand edge, px16 / py12
  cardCollecting: {
    backgroundColor: theme.surface.brandSubtle,
    borderWidth: 1.5,
    borderColor: theme.border.brand,
    borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
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
  addMomentBtn: {
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
  addMomentBtnLabel: {
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
    ...theme.typography.body, // Inter Regular 16/20, not a button label
    color: theme.text.brand,
  },
  genBody: {
    padding: theme.spacing.l,
    gap: 10,
  },

  // StoryCard Property=Locked (44:28) — amber quota banner
  cardLocked: {
    backgroundColor: theme.surface.warningSubtle,
    borderWidth: 1,
    borderColor: theme.border.warning,
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
    ...theme.typography.h3, // Manrope SemiBold 16/22 — month headings
    color: theme.text.primary,
  },
  // 44:39 — a generated Story's own title is Heading2, not Heading3
  storyTitle: {
    ...theme.typography.h2,
    color: theme.text.primary,
  },
  storyExcerpt: {
    ...theme.typography.body,
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
  // nsImgArea 744:4029 — surface/disabled band, 140 tall, gap 8
  nsImgArea: {
    height: 140,
    backgroundColor: theme.surface.disabled,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.l,
  },
  nsImgCaption: {
    ...theme.typography.body, // Inter Regular 16/20
    color: theme.text.secondary,
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

  // Notify strip inside AllowRegenerate / -2 (762:3547) — info-subtle fill with
  // a border/info edge and its own radius/s, not a bare full-bleed band
  regenStrip: {
    backgroundColor: theme.surface.infoSubtle,
    borderWidth: 1,
    borderColor: theme.border.info,
    borderRadius: theme.radius.s, // 6
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.l,
    marginHorizontal: theme.spacing.l,
    marginTop: theme.spacing.l,
  },
  regenStripLabel: {
    ...theme.typography.caption,
    color: theme.text.info,
  },

  // Premium-ended renew button (DS Premium, sized to the card)
  renewBtn: { height: 44 },

  // S-Regeneration confirm popup (761:2717) — DS Bottom Sheet geometry
  regenScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  regenSheet: {
    backgroundColor: theme.surface.card,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.l,
  },
  regenHandle: {
    width: 36,
    height: 4,
    borderRadius: 3,
    backgroundColor: theme.border.default,
    alignSelf: 'center',
    marginBottom: theme.spacing.s,
  },
  regenTitle: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.primary,
  },
  regenBody: {
    ...theme.typography.body, // Inter Regular 16/20, text/primary
    color: theme.text.primary,
  },
  // cta 810:3045 — py8, buttons 16 apart
  regenCta: {
    paddingVertical: theme.spacing.s,
    gap: theme.spacing.l,
    alignItems: 'center',
  },
  regenCancelBtn: { height: 44 },
});
