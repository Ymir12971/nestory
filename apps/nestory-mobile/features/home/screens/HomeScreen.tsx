import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import type { Child, Moment } from '@nestory/types';
import { BottomSheet, sheetSection } from '@/shared/components/BottomSheet';
import { Button } from '@/shared/components/Button';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { PaywallModal } from '@/shared/components/PaywallModal';
import { AddMomentEntrySheet } from '@/shared/components/AddMomentEntrySheet';
import { formatAge } from '@/shared/lib/formatAge';
import { palette, theme } from '@/shared/theme';
import { useAssetMonths, useAssets, useChildren, useSetActiveChild, useSubscription } from '@/api';

// Home tab (Figma H- row). Two layouts, switched on whether any Moment exists:
//
//   no Moments yet      H-Home Empty 731:1270 — hero image behind a white
//                       headline + avatar row, then a centred camera tile,
//                       prompt line and the Add CTA.
//   any Moment          H-First Memory 731:1304 / H-Normal Memory list
//                       731:1370 — plain header (avatar + name), year/month
//                       Filter, date-grouped timeline, floating CTA.
//
// The pre-redesign hero photo carousel, three-up Stats card and
// "N moments this month · View All" summary row appear nowhere in the H- row
// and were removed (Justin 2026-08-05, 方案 A). /moment/list retired with them.

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SWITCHER_GENDER_LABEL: Record<string, string> = { girl: 'Girl', boy: 'Boy' };

/** "2y 4mo old, Girl" — gender omitted for prefer_not_to_say (Figma). */
function profileSubtitle(child: Child): string {
  const age = formatAge(child.birthDate);
  const gender = child.gender ? SWITCHER_GENDER_LABEL[child.gender] : undefined;
  return gender ? `${age}, ${gender}` : age;
}

interface DayGroup {
  key: string; // YYYY-MM-DD
  dayNum: string;
  monthAbbr: string;
  moments: Moment[];
}

function groupByDay(items: Moment[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const m of items) {
    const d = new Date(m.capturedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let group = map.get(key);
    if (!group) {
      group = { key, dayNum: String(d.getDate()), monthAbbr: MONTH_LABELS[d.getMonth()]!, moments: [] };
      map.set(key, group);
    }
    group.moments.push(m);
  }
  // Newest day first; newest Moment first within a day.
  return [...map.values()]
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map((g) => ({
      ...g,
      moments: [...g.moments].sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      ),
    }));
}

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [addEntryVisible, setAddEntryVisible] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const childrenQ = useChildren();
  const subQ = useSubscription();
  const setActive = useSetActiveChild();

  const profiles = childrenQ.data ?? [];
  const activeChild = profiles.find((p) => p.isActive) ?? profiles[0];
  const activeChildId = activeChild?.id ?? '';
  const isMulti = profiles.length > 1;
  const isPremium =
    subQ.data?.subscriptionStatus === 'premium_active' ||
    subQ.data?.subscriptionStatus === 'trial_active';

  // Filter rules (H-First Memory / Normal list annotations): months shown =
  // months that HAVE Moments + the current month (always), newest first so the
  // current month is leftmost. Gap months stay hidden, which makes the timeline
  // start at the first Moment's month.
  const monthsQ = useAssetMonths(activeChildId);
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const filterKeys = useMemo(() => {
    const keys = new Set<string>([currentKey]);
    for (const m of monthsQ.data ?? []) keys.add(m.monthKey);
    return [...keys].sort((a, b) => (a < b ? 1 : -1)); // DESC
  }, [monthsQ.data, currentKey]);

  const availableYears = useMemo(
    () => [...new Set(filterKeys.map((k) => Number(k.slice(0, 4))))],
    [filterKeys],
  );
  const yearKeys = filterKeys.filter((k) => Number(k.slice(0, 4)) === selectedYear);

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const assetsQ = useAssets({ childId: activeChildId, month: monthKey });
  const groups = useMemo(() => groupByDay(assetsQ.data?.data ?? []), [assetsQ.data]);

  /** No Moment in any month → the H-Home Empty layout. */
  const hasAnyMoments = (monthsQ.data?.length ?? 0) > 0;

  if (childrenQ.isLoading || subQ.isLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.text.brand} />
      </View>
    );
  }

  if (childrenQ.isError || subQ.isError) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.emptyText}>Failed to load home.</Text>
        <Pressable
          onPress={() => {
            childrenQ.refetch();
            subQ.refetch();
          }}
        >
          <Text style={styles.retryText}>Tap to retry</Text>
        </Pressable>
      </View>
    );
  }

  // No children yet — shouldn't happen post-onboarding, but recover gracefully.
  if (!activeChild) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.emptyText}>No child profile yet.</Text>
        <Pressable onPress={() => router.push('/onboarding/profile')}>
          <Text style={styles.retryText}>Set up profile</Text>
        </Pressable>
      </View>
    );
  }

  const openSwitcher = () => {
    if (isMulti) setSwitcherVisible(true);
    else router.push(`/settings/profiles/${activeChild.id}`);
  };

  const handleSwitch = (id: string) => {
    setActive.mutate(id);
    setSwitcherVisible(false);
  };

  /** avatarRow 731:1277 / 731:1374 — 28px avatar + name, switch affordance when multi. */
  const avatarRow = (onHero: boolean) => (
    <Pressable style={styles.avatarRow} hitSlop={8} onPress={openSwitcher}>
      {activeChild.avatarUrl ? (
        <Image
          source={{ uri: activeChild.avatarUrl }}
          style={[styles.avatar, !onHero && styles.avatarRinged]}
        />
      ) : (
        <View style={[styles.avatar, !onHero && styles.avatarRinged]} />
      )}
      <Text style={[styles.childName, onHero && styles.childNameOnHero]}>{activeChild.name}</Text>
      {isMulti && (
        <RemixIcon
          name="arrow-up-down-line"
          size={24}
          color={onHero ? theme.text.onColor : theme.text.primary}
        />
      )}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      {assetsQ.isError && hasAnyMoments ? (
        /* H-Moments couldn't load 774:3710 — header keeps a hairline, the
           Filter is hidden, and the Abnormal block centres in the body.
           Pull-to-refresh stays per the annotation. */
        <>
          <View style={[styles.plainHeader, styles.headerRuled, { paddingTop: insets.top }]}>
            {avatarRow(false)}
          </View>
          <ScrollView
            contentContainerStyle={styles.abnormalWrap}
            refreshControl={
              <RefreshControl
                refreshing={assetsQ.isRefetching}
                onRefresh={() => void assetsQ.refetch()}
              />
            }
          >
            <View style={styles.abnormal}>
              {/* Design uses global-off-line; not in this react-native-remix-icon
                  build, so the equivalent wifi-off-line stands in. */}
              <RemixIcon name="wifi-off-line" size={48} color={theme.text.secondary} />
              <View style={styles.abnormalText}>
                <Text style={styles.abnormalTitle}>Moments couldn't load</Text>
                <Text style={styles.abnormalBody}>Check your connection and try again.</Text>
              </View>
            </View>
          </ScrollView>
        </>
      ) : hasAnyMoments ? (
        <>
          {/* header 731:1373 */}
          <View style={[styles.plainHeader, { paddingTop: insets.top }]}>{avatarRow(false)}</View>

          {/* Filter 744:2530 */}
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
                const active = monthNum === selectedMonth;
                return (
                  <Pressable
                    key={key}
                    style={[styles.monthPill, active && styles.monthPillActive]}
                    onPress={() => setSelectedMonth(monthNum)}
                  >
                    <Text style={[styles.monthPillLabel, active && styles.monthPillLabelActive]}>
                      {MONTH_LABELS[monthNum - 1]!}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* timeline 731:1400 */}
          {assetsQ.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.text.brand} />
            </View>
          ) : groups.length === 0 ? (
            /* H-Current month empty 731:2602 — same camera tile as first run,
               different copy, and the Filter stays visible above it */
            <View style={styles.monthEmpty}>
              <View style={styles.emptyPrompt}>
                <View style={styles.cameraTile}>
                  <RemixIcon name="camera-line" size={72} color={palette.primary[500]} />
                </View>
                <Text style={styles.emptyTitle}>Anything to keep this month?</Text>
                <Text style={styles.emptyHint}>A photo or a quick note :)</Text>
              </View>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.timeline}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={assetsQ.isRefetching}
                  onRefresh={() => void assetsQ.refetch()}
                />
              }
            >
              {groups.map((group) => (
                <View key={group.key} style={styles.dayGroup}>
                  <View style={styles.timelineLeft}>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeDay}>{group.dayNum}</Text>
                      <Text style={styles.dateBadgeMonth}>{group.monthAbbr}</Text>
                    </View>
                    {/* 731:1407 — the rail continues under every date chip */}
                    <View style={styles.connectorLine} />
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
                          {cover && (
                            <View style={styles.cardPhotoWrap}>
                              <Image source={{ uri: cover.fileUrl }} style={styles.cardPhotoImg} />
                              {photoCount > 1 && (
                                <View style={styles.photoBadge}>
                                  <RemixIcon name="image-line" size={10} color={theme.text.onColor} />
                                  <Text style={styles.photoBadgeCount}>{photoCount}</Text>
                                </View>
                              )}
                            </View>
                          )}
                          {/* memContent 42:39 — one 72-tall text block, no time line */}
                          <View style={styles.cardBody}>
                            <Text style={styles.cardText} numberOfLines={3}>
                              {moment.textNote ?? '(no caption)'}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* cta 731:1468 — floating block with an upward shadow */}
          <View style={styles.floatingCta}>
            <Button label="+ Add Moment" onPress={() => setAddEntryVisible(true)} />
          </View>
        </>
      ) : (
        <>
          {/* header 731:1271 — hero art behind the headline and avatar row */}
          <ImageBackground
            source={require('@/assets/images/home-hero-bg.png')}
            style={styles.heroHeader}
            imageStyle={styles.heroImage}
            resizeMode="cover"
          >
            <View style={{ height: insets.top }} />
            <View style={styles.heroHeadlineBlock}>
              {/* Copy per Justin 2026-08-09. The frame reads "Turn every moment
                  into a Memory", which the Memory→Moment rename turned into
                  "...into a Moment" — the same word twice, and this is the
                  first line a new user sees. */}
              <Text style={styles.heroHeadline}>Every little moment is worth keeping.</Text>
            </View>
            <View style={styles.heroAvatarBlock}>{avatarRow(true)}</View>
          </ImageBackground>

          {/* body 731:1282 */}
          <View style={styles.emptyBody}>
            <View style={styles.emptyPrompt}>
              <View style={styles.cameraTile}>
                <RemixIcon name="camera-4-line" size={72} color={palette.primary[500]} />
              </View>
              <Text style={styles.emptyTitle}>Start with {activeChild.name}'s first Moment</Text>
            </View>
            <View style={styles.emptyCtaBlock}>
              <Text style={styles.emptyHint}>A photo or a quick note :)</Text>
              <Button label="+ Add Moment" onPress={() => setAddEntryVisible(true)} />
            </View>
          </View>
        </>
      )}

      {/* Year picker */}
      <BottomSheet visible={yearPickerVisible} onRequestClose={() => setYearPickerVisible(false)}>
        <View style={styles.sheetPad}>
          <Text style={styles.sheetTitle}>Select Year</Text>
          {availableYears.map((y) => (
            <Pressable
              key={y}
              style={styles.yearRow}
              onPress={() => {
                setSelectedYear(y);
                // Land on that year's newest visible month (pills are DESC).
                const first = filterKeys.find((k) => Number(k.slice(0, 4)) === y);
                if (first) setSelectedMonth(Number(first.slice(5, 7)));
                setYearPickerVisible(false);
              }}
            >
              <Text style={[styles.yearRowLabel, y === selectedYear && styles.yearRowLabelActive]}>
                {y}
              </Text>
              {y === selectedYear && <RemixIcon name="check-line" size={20} color={theme.text.brand} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* Profile Switcher — Free 770:2914 / Premium 770:2943 */}
      <BottomSheet visible={switcherVisible} onRequestClose={() => setSwitcherVisible(false)}>
        <View style={sheetSection.title}>
          <View style={styles.switcherTitleBlock}>
            <Text style={styles.sheetTitle}>Switch Profile</Text>
            {!isPremium && (
              <Text style={styles.sheetSubtitle}>
                Free plan supports one active profile. Upgrade to switch between them.
              </Text>
            )}
          </View>
        </View>

        <View style={sheetSection.body}>
          {profiles.map((profile: Child, i) => {
            const isActive = profile.isActive;
            // Free: non-active rows aren't tappable — the subtitle explains why,
            // and the only actions are the Upgrade CTA or dismissing the sheet
            // (annotation). The design doesn't dim them.
            const isLocked = !isActive && !isPremium;
            return (
              <View key={profile.id}>
                {i > 0 && <View style={styles.profileDivider} />}
                <Pressable
                  style={styles.profileRow}
                  onPress={() => handleSwitch(profile.id)}
                  disabled={isActive || isLocked}
                >
                  {profile.avatarUrl ? (
                    <Image source={{ uri: profile.avatarUrl }} style={styles.profileAvatar} />
                  ) : (
                    <View style={styles.profileAvatar} />
                  )}
                  <View style={styles.profileTextCol}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    <Text style={styles.profileSub}>{profileSubtitle(profile)}</Text>
                  </View>
                  {isActive && (
                    <StatusBadge
                      type="active"
                      // 决策7: Free says "Active", Premium says "Current" (per Figma)
                      label={isPremium ? 'Current' : 'Active'}
                    />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        {!isPremium && (
          <View style={styles.switcherCta}>
            <Button
              label="Upgrade to Premium"
              type="premium"
              onPress={() => {
                setSwitcherVisible(false);
                setPaywallVisible(true);
              }}
            />
            <Button
              label="View Premium benefits"
              type="text"
              onPress={() => {
                setSwitcherVisible(false);
                setPaywallVisible(true);
              }}
            />
          </View>
        )}
      </BottomSheet>

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
    </View>
  );
}

const DATE_BADGE_W = 35;
const CARD_PHOTO = 72;
const CARD_H = 92;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.surface.default },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  emptyText: { ...theme.typography.body, color: theme.text.secondary },
  retryText: { ...theme.typography.buttonLabelM, color: theme.text.brand },

  // ── Populated header (731:1373) ────────────────────────────────────────────
  plainHeader: {
    paddingHorizontal: theme.spacing.xl, // 20
  },
  // The couldn't-load state draws a hairline under the header (774:3711)
  headerRuled: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border.default,
  },

  // DS Abnormal · Type=WebIssue (774:3808) — 300 wide, p24, gap20
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
    padding: theme.spacing.xxl, // 24
    gap: theme.spacing.xl, // 20
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: theme.spacing.l, // 16
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 20,
    backgroundColor: theme.surface.brandSubtle,
  },
  avatarRinged: {
    borderWidth: 2,
    borderColor: theme.surface.brand, // 731:1375
  },
  childName: { ...theme.typography.h2, color: theme.text.primary },
  childNameOnHero: { color: theme.text.onColor },

  // ── Hero header, empty state (731:1271) ───────────────────────────────────
  heroHeader: {
    paddingBottom: theme.spacing.s, // 8
    borderBottomLeftRadius: theme.radius.l,
    borderBottomRightRadius: theme.radius.l,
    overflow: 'hidden',
  },
  heroImage: { height: 480 },
  heroHeadlineBlock: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
  },
  heroHeadline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
    lineHeight: 40,
    color: theme.text.onColor,
  },
  heroAvatarBlock: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.m, // 12 — the hero row is tighter than the plain one
  },

  // ── Empty body (731:1282) ─────────────────────────────────────────────────
  emptyBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 102,
    gap: theme.spacing.xxl, // 24
  },
  emptyPrompt: { width: 238, alignItems: 'center', gap: theme.spacing.s },
  // timeline 731:2602 — the empty-month block centres in the timeline area
  monthEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: theme.spacing.l,
  },
  cameraTile: {
    width: 128,
    height: 128,
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyTitle: {
    ...theme.typography.body,
    color: palette.neutral.black,
    textAlign: 'center',
  },
  emptyCtaBlock: { alignSelf: 'stretch', alignItems: 'center', gap: theme.spacing.s },
  emptyHint: {
    ...theme.typography.body,
    color: theme.text.secondary,
    textAlign: 'center',
  },

  // ── Filter (744:2530) ─────────────────────────────────────────────────────
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingLeft: theme.spacing.xl,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.s,
  },
  yearSelector: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  yearText: { ...theme.typography.h4, color: theme.text.primary },
  filterDivider: { width: 1, height: 20, backgroundColor: theme.border.default },
  monthPills: { gap: theme.spacing.s, paddingRight: theme.spacing.xl },
  monthPill: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.brand,
    backgroundColor: theme.surface.card,
  },
  monthPillActive: {
    backgroundColor: theme.surface.brand,
    borderColor: theme.surface.brand,
  },
  monthPillLabel: { ...theme.typography.tagBadge, color: theme.text.brand },
  monthPillLabelActive: { color: theme.text.onColor },

  // ── Timeline (731:1400) ───────────────────────────────────────────────────
  scroll: { flex: 1 },
  timeline: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: 196, // clears the floating CTA + tab bar (731:1467)
  },
  dayGroup: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.l,
  },
  timelineLeft: { width: DATE_BADGE_W, alignItems: 'center' },
  dateBadge: {
    width: DATE_BADGE_W,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.m,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
  },
  dateBadgeDay: { ...theme.typography.h2, color: theme.text.brand },
  dateBadgeMonth: { ...theme.typography.caption, color: theme.text.brand },
  connectorLine: {
    flex: 1,
    width: 2,
    marginTop: theme.spacing.xs,
    marginBottom: -theme.spacing.l,
    backgroundColor: theme.border.default,
  },
  dayCards: { flex: 1 },

  // MemoryCard 290:2523
  momentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: CARD_H,
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 10,
    gap: theme.spacing.m,
  },
  momentCardGap: { marginBottom: theme.spacing.m },
  cardPhotoWrap: {
    width: CARD_PHOTO,
    height: CARD_PHOTO,
    borderRadius: theme.radius.m,
    backgroundColor: palette.neutral[200],
    overflow: 'hidden',
  },
  cardPhotoImg: { width: CARD_PHOTO, height: CARD_PHOTO },
  photoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    backgroundColor: theme.overlay.scrim, // overlay-65
    borderRadius: theme.radius.s, // 6
    paddingHorizontal: 4,
  },
  photoBadgeCount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    lineHeight: 12,
    color: theme.text.onColor,
  },
  cardBody: { flex: 1, height: CARD_PHOTO, overflow: 'hidden' },
  cardText: { ...theme.typography.body, color: theme.text.primary },

  // ── Floating CTA (731:1468) ───────────────────────────────────────────────
  floatingCta: {
    backgroundColor: theme.surface.default,
    paddingHorizontal: 20,
    paddingVertical: theme.spacing.l,
    shadowColor: '#e3e3e3',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Sheets ────────────────────────────────────────────────────────────────
  sheetPad: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.s,
    gap: theme.spacing.s,
  },
  // 770:2918 — H1 title over a Caption subtitle, 8 apart
  switcherTitleBlock: { gap: theme.spacing.s },
  sheetTitle: { ...theme.typography.h1, color: theme.text.primary },
  sheetSubtitle: { ...theme.typography.caption, color: theme.text.secondary },

  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.default,
  },
  yearRowLabel: { ...theme.typography.body, color: theme.text.primary },
  yearRowLabelActive: { color: theme.text.brand, fontFamily: 'Manrope_600SemiBold' },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m, // 12
    paddingVertical: theme.spacing.m, // 12
  },
  // 775:1920 — a translucent hairline between rows only, not border/default
  profileDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brandSubtle,
  },
  profileTextCol: { flex: 1, gap: 2 },
  profileName: { ...theme.typography.h3, color: theme.text.primary },
  profileSub: { ...theme.typography.caption, color: theme.text.secondary },
  // cta 775:1959 — px20 / pt12, buttons 4 apart
  switcherCta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 12,
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
});
