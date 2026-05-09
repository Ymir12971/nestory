import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';
import { useChildren } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';

function formatBirthDate(birthDate: string): string {
  const d = new Date(birthDate);
  return `Born ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// ---------- Screen ----------

export function ChildProfileListScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const childrenQ = useChildren();

  const renderBody = () => {
    if (childrenQ.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      );
    }

    if (childrenQ.isError || !childrenQ.data) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load profiles.</Text>
          <Pressable onPress={() => childrenQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      );
    }

    const profiles = childrenQ.data;

    if (profiles.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <RemixIcon name="user-add-line" size={32} color={theme.text.brand} />
          </View>
          <Text style={styles.emptyTitle}>No child profiles yet</Text>
          <Text style={styles.emptyBody}>
            Add a child to start capturing memories.
          </Text>
        </View>
      );
    }

    return (
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
        {profiles.map((profile) => (
          <Pressable
            key={profile.id}
            style={styles.card}
            onPress={() => router.push(`/settings/profiles/${profile.id}`)}
          >
            <View style={[styles.avatar, { backgroundColor: theme.surface.brand }]} />
            <View style={styles.col}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileDob}>{formatBirthDate(profile.birthDate)}</Text>
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
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Child Profiles</Text>
        <View style={styles.navSpacer} />
      </View>

      {renderBody()}

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

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  retryText: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.s,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.s,
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
});
