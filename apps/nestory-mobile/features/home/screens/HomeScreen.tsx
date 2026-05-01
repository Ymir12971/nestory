import { useState } from 'react';
import { Dimensions, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';
import { PaywallModal } from '@/shared/components/PaywallModal';

const SCREEN_W = Dimensions.get('window').width;

const PHOTO_CENTER_W = 225;
const PHOTO_CENTER_H = 300;
const PHOTO_SIDE_W   = 195;
const PHOTO_SIDE_H   = 260;
const PHOTO_GAP      = 12;

// Horizontal padding to center the active (center) photo
const CAROUSEL_PADDING = (SCREEN_W - PHOTO_CENTER_W) / 2;
// Scroll offset so center photo is visible on mount
const CAROUSEL_INIT_X  = PHOTO_SIDE_W + PHOTO_GAP;

const DOTS_TOTAL = 6;

// TODO: replace with real data from GET /children
const MOCK_PROFILES = [
  { id: 'child-1', name: 'Emma',   isActive: true  },
  { id: 'child-2', name: 'Oliver', isActive: false },
];
// TODO: derive from GET /subscriptions/me
const MOCK_IS_PREMIUM = false;
// TODO: derive from GET /assets count for active child
const MOCK_MEMORY_COUNT: number = 12;

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [profiles, setProfiles] = useState(MOCK_PROFILES);

  const activeProfile = profiles.find(p => p.isActive) ?? profiles[0]!;
  const isMulti = profiles.length > 1;

  const handleAvatarRowPress = () => {
    if (isMulti) {
      setSwitcherVisible(true);
    } else {
      router.push(`/settings/profiles/${activeProfile.id}`);
    }
  };

  const handleSwitch = (id: string) => {
    setProfiles(prev => prev.map(p => ({ ...p, isActive: p.id === id })));
    setSwitcherVisible(false);
  };

  return (
    <View style={styles.root}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <ImageBackground
        source={require('@/assets/images/home-hero-bg.png')}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={{ height: insets.top }} />

        {/* Header: avatar row + settings */}
        <View style={styles.header}>
          <Pressable
            style={styles.avatarRow}
            hitSlop={8}
            onPress={handleAvatarRowPress}
          >
            <View style={styles.avatar} />
            <Text style={styles.childName}>{activeProfile.name}</Text>
            {isMulti && (
              <RemixIcon name="arrow-up-down-line" size={24} color={theme.text.onColor} />
            )}
          </Pressable>
          <Pressable hitSlop={8} onPress={() => router.push('/settings')}>
            <RemixIcon name="settings-line" size={24} color={theme.text.onColor} />
          </Pressable>
        </View>

        {MOCK_MEMORY_COUNT === 0 ? (
          /* Empty state — no memories yet */
          <View style={styles.emptyHero}>
            <View style={styles.emptyHeroCard}>
              <RemixIcon name="image-add-line" size={48} color={theme.text.onColor} />
              <Text style={styles.emptyHeroTitle}>No memories yet</Text>
              <Text style={styles.emptyHeroBody}>
                Tap below to capture your first moment.
              </Text>
            </View>
          </View>
        ) : (
          <>
            {/* Photo carousel */}
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
              {/* TODO: replace placeholders with real memory photos */}
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
          </>
        )}
      </ImageBackground>

      {/* ── Body ─────────────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Stats card — taps to child profile edit */}
        <Pressable
          style={styles.statsCard}
          onPress={() => router.push('/settings/profiles/1')}
        >
          <View style={styles.statCol}>
            <Text style={styles.statValue}>1.4</Text>
            <Text style={styles.statLabel}>years old</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>40</Text>
            <Text style={styles.statLabel}>cm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>25</Text>
            <Text style={styles.statLabel}>kg</Text>
          </View>
        </Pressable>

        {/* Monthly summary row — taps to memory list */}
        {MOCK_MEMORY_COUNT > 0 && (
        <Pressable
          style={styles.summaryRow}
          onPress={() => router.push('/memory/list')}
        >
          <View style={styles.summaryLeft}>
            <RemixIcon name="chat-smile-ai-line" size={20} color={theme.text.primary} />
            <Text style={styles.summaryText}>
              {MOCK_MEMORY_COUNT} {MOCK_MEMORY_COUNT === 1 ? 'memory' : 'memories'} this month
            </Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.viewAllText}>View All</Text>
            <RemixIcon name="arrow-right-s-line" size={14} color={theme.text.brand} />
          </View>
        </Pressable>
        )}
      </View>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <View style={styles.cta}>
        <Text style={styles.ctaPrompt}>Did your little one smile today?</Text>
        <Pressable
          style={({ pressed }) => [styles.buttonWrap, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/memory/add')}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>+ Add Memory</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ── Profile Switcher Sheet ────────────────────────────── */}
      <Modal
        visible={switcherVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSwitcherVisible(false)}
      >
        <Pressable style={styles.sheetScrim} onPress={() => setSwitcherVisible(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Drag handle */}
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Switch Child</Text>
          {profiles.map(profile => {
            const isActive  = profile.isActive;
            const isLocked  = !isActive && !MOCK_IS_PREMIUM;
            const isDimmed  = isLocked;
            return (
              <Pressable
                key={profile.id}
                style={[styles.profileRow, isDimmed && styles.profileRowDimmed]}
                onPress={
                  isLocked
                    ? () => { setSwitcherVisible(false); setPaywallVisible(true); }
                    : () => handleSwitch(profile.id)
                }
                disabled={isActive}
              >
                <View style={[styles.profileAvatar, isDimmed && styles.profileAvatarDimmed]} />
                <Text style={[styles.profileName, isDimmed && styles.profileNameDimmed]}>
                  {profile.name}
                </Text>
                {isActive && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeLabel}>Current</Text>
                  </View>
                )}
                {isLocked && (
                  <View style={styles.premiumBadge}>
                    <RemixIcon name="lock-line" size={12} color={theme.text.onColor} />
                    <Text style={styles.premiumBadgeLabel}>Premium</Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {!MOCK_IS_PREMIUM && (
            <Pressable
              style={({ pressed }) => [styles.upgradeCta, pressed && { opacity: 0.85 }]}
              onPress={() => { setSwitcherVisible(false); setPaywallVisible(true); }}
            >
              <LinearGradient
                colors={[palette.primary[500], palette.primary[400]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeBtn}
              >
                <Text style={styles.upgradeBtnLabel}>Upgrade to Premium</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </Modal>

      <PaywallModal
        visible={paywallVisible}
        variant="D"
        onSubscribe={() => setPaywallVisible(false)}
        onDismiss={() => setPaywallVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

  // Hero
  hero: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface.brandSubtle,
  },
  childName: {
    ...theme.typography.h1,
    color: theme.text.onColor,
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
  emptyHero: {
    height: PHOTO_CENTER_H + 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyHeroCard: {
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.xxl,
  },
  emptyHeroTitle: {
    ...theme.typography.h2,
    color: theme.text.onColor,
    textAlign: 'center',
  },
  emptyHeroBody: {
    ...theme.typography.body,
    color: theme.text.onColor,
    textAlign: 'center',
    opacity: 0.85,
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.l,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    height: 76,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.l,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...theme.typography.h2,
    color: theme.text.primary,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.border.default,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    height: 46,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    color: theme.text.brand,
  },

  // CTA
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.s,
  },

  // Profile Switcher Sheet
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
    gap: theme.spacing.s,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border.strong,
    alignSelf: 'center',
    marginBottom: theme.spacing.s,
  },
  sheetTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
    marginBottom: theme.spacing.xs,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingVertical: theme.spacing.m,
  },
  profileRowDimmed: {
    opacity: 0.45,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surface.brand,
  },
  profileAvatarDimmed: {
    backgroundColor: theme.surface.disabled,
  },
  profileName: {
    ...theme.typography.h3,
    color: theme.text.primary,
    flex: 1,
  },
  profileNameDimmed: {
    color: theme.text.secondary,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
  },
  currentBadgeLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.onColor,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.premium,
  },
  premiumBadgeLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.onColor,
  },
  ctaPrompt: {
    ...theme.typography.body,
    color: theme.text.secondary,
    textAlign: 'center',
  },
  buttonWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.surface.brandSubtle,
  },
  button: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  upgradeCta: {
    marginTop: theme.spacing.s,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.surface.brandSubtle,
  },
  upgradeBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
});
