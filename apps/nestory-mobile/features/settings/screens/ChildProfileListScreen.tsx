import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';

// ---------- Types ----------

interface ChildProfile {
  id: string;
  name: string;
  dob: string;       // display string, e.g. "Mar 15, 2025"
  isActive: boolean;
  avatarColor: string;
}

// ---------- Mock data — replace with GET /children ----------

const MOCK_PROFILES: ChildProfile[] = [
  { id: 'child-1', name: 'Emma',   dob: 'Born Mar 15, 2025', isActive: true,  avatarColor: theme.surface.brand },
  { id: 'child-2', name: 'Oliver', dob: 'Born Jan 8, 2024',  isActive: false, avatarColor: palette.accent[300] },
];

// ---------- Screen ----------

export function ChildProfileListScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Child Profiles</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning notify — Free plan multi-profile restriction */}
        <View style={styles.notify}>
          <RemixIcon name="error-warning-line" size={16} color={theme.text.warning} />
          <Text style={styles.notifyText}>
            Free plan supports one active profile. You can add more, but switching requires Premium.
          </Text>
        </View>

        {/* Profile cards */}
        {MOCK_PROFILES.map((profile, i) => (
          <Pressable
            key={profile.id}
            style={styles.card}
            onPress={() => router.push(`/settings/profiles/${profile.id}`)}
          >
            <View style={[styles.avatar, { backgroundColor: profile.avatarColor }]} />
            <View style={styles.col}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileDob}>{profile.dob}</Text>
            </View>
            {profile.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeLabel}>Active</Text>
              </View>
            )}
            <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
          </Pressable>
        ))}
      </ScrollView>

      {/* CTA — Add Child */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.addBtnWrap, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/settings/profiles/new')}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnLabel}>Add Child</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  navTitle:  { ...theme.typography.h2, color: theme.text.primary },
  navSpacer: { width: 24 },

  scroll: { flex: 1 },
  body: {
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.m,
  },

  // Warning notify — surface.warningSubtle, radius.s, px-16 py-8, gap-4
  notify: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.surface.warningSubtle,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
    gap: 4,
  },
  notifyText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: theme.text.warning,
  },

  // Profile card — surface.card, radius.l, no border (per Figma)
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface.card,
    borderRadius: theme.radius.l,
    padding: theme.spacing.l,
    gap: theme.spacing.m,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  col: { flex: 1, gap: 2 },
  profileName: { ...theme.typography.h4,      color: theme.text.primary   },
  profileDob:  { ...theme.typography.caption,  color: theme.text.secondary },

  activeBadge: {
    backgroundColor: theme.surface.successSubtle,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  activeBadgeLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.success,
  },

  // CTA
  cta: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.xl,
  },
  addBtnWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: palette.primary[50],
  },
  addBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
});
