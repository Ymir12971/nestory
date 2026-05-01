import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';

// ---------- Mock data — replace with real auth/subscription context ----------

const MOCK_USER = { name: 'Sarah Johnson', email: 'sarah.j@gmail.com' };
const MOCK_CHILD = { name: 'Emma', avatarColor: theme.surface.brand };

// TODO: derive from GET /subscriptions/me
type SubStatus = 'free' | 'trial' | 'premium' | 'trial_ended' | 'premium_ended';
const MOCK_SUB_STATUS: SubStatus = 'free';
const MOCK_RENEW_DATE = 'Jan 15, 2026'; // TODO: from API

function getSubEntry(sub: SubStatus): {
  label: string;
  subtitle: string;
  badge: string;
  badgeVariant: 'upgrade' | 'active' | 'renew';
  route: '/settings/subscription';
} {
  if (sub === 'premium' || sub === 'trial') {
    return { label: 'Premium', subtitle: `Renews ${MOCK_RENEW_DATE}`, badge: 'Active', badgeVariant: 'active', route: '/settings/subscription' };
  }
  if (sub === 'trial_ended' || sub === 'premium_ended') {
    return { label: 'Premium', subtitle: `Expired ${MOCK_RENEW_DATE}`, badge: 'Renew', badgeVariant: 'renew', route: '/settings/subscription' };
  }
  return { label: 'Free Plan', subtitle: '2 Stories remaining', badge: 'Upgrade', badgeVariant: 'upgrade', route: '/settings/subscription' };
}

// ---------- Sub-components ----------

function SectionLabel({ label }: { label: string }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function NavRow({
  label,
  subtitle,
  right,
  onPress,
}: {
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowCol}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />}
    </Pressable>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCol}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.toggleWrap}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.border.default, true: theme.surface.brand }}
          thumbColor={theme.surface.card}
          ios_backgroundColor={theme.border.default}
        />
        <Text style={[styles.toggleLabel, value ? styles.toggleLabelOn : styles.toggleLabelOff]}>
          {value ? 'On' : 'Off'}
        </Text>
      </View>
    </View>
  );
}

// ---------- Screen ----------

export function SettingsScreen() {
  const router = useRouter();
  const [storyNotif, setStoryNotif] = useState(true);
  const [uploadRemind, setUploadRemind] = useState(false);
  const [location, setLocation] = useState(false);
  const subEntry = getSubEntry(MOCK_SUB_STATUS);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ACCOUNT */}
        <View style={styles.group}>
          <SectionLabel label="ACCOUNT" />
          <Card>
            <NavRow
              label={MOCK_USER.name}
              subtitle={MOCK_USER.email}
              onPress={() => router.push('/settings/account')}
            />
          </Card>
        </View>

        {/* CHILD PROFILE */}
        <View style={styles.group}>
          <SectionLabel label="CHILD PROFILE" />
          <Card>
            <Pressable style={styles.row} onPress={() => router.push('/settings/profiles')}>
              <View style={[styles.avatar, { backgroundColor: MOCK_CHILD.avatarColor }]} />
              <View style={styles.rowCol}>
                <Text style={styles.rowLabel}>{MOCK_CHILD.name}</Text>
              </View>
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
            </Pressable>
          </Card>
        </View>

        {/* SUBSCRIPTION — 3 states: Upgrade / Active / Renew */}
        <View style={styles.group}>
          <SectionLabel label="SUBSCRIPTION" />
          <Card>
            <NavRow
              label={subEntry.label}
              subtitle={subEntry.subtitle}
              onPress={() => router.push(subEntry.route)}
              right={
                <View style={subEntry.badgeVariant === 'active' ? styles.activeBadge : styles.upgradeBadge}>
                  <Text style={subEntry.badgeVariant === 'active' ? styles.activeBadgeLabel : styles.upgradeBadgeLabel}>
                    {subEntry.badge}
                  </Text>
                </View>
              }
            />
          </Card>
        </View>

        {/* NOTIFICATIONS */}
        <View style={styles.group}>
          <SectionLabel label="NOTIFICATIONS" />
          <Card>
            <ToggleRow
              label="Story Notifications"
              subtitle="Get notified when your Story is ready"
              value={storyNotif}
              onValueChange={setStoryNotif}
            />
            <Divider />
            <ToggleRow
              label="Upload Reminders"
              subtitle="Gentle reminders every 3 days"
              value={uploadRemind}
              onValueChange={setUploadRemind}
            />
          </Card>
        </View>

        {/* STORIES */}
        <View style={styles.group}>
          <SectionLabel label="STORIES" />
          <Card>
            {/* TODO(justin): when On + iOS authorized, persist optional `location` field via backend */}
            <ToggleRow
              label="Stories · Location"
              subtitle="For enriching monthly Stories."
              value={location}
              onValueChange={setLocation}
            />
          </Card>
        </View>

        {/* MORE */}
        <View style={styles.group}>
          <SectionLabel label="MORE" />
          <Card>
            <NavRow label="Data & Privacy" onPress={() => router.push('/settings/privacy')} />
            <Divider />
            <NavRow label="Feedback" onPress={() => router.push('/settings/feedback')} />
            <Divider />
            <NavRow label="About" onPress={() => router.push('/settings/about')} />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  navTitle: {
    ...theme.typography.h2,
    color: theme.text.primary,
  },
  navSpacer: { width: 24 },

  scroll: { flex: 1 },
  body: {
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.xxl,
  },

  group: { gap: theme.spacing.s },

  sectionLabelWrap: {
    paddingBottom: 4,
    paddingLeft: 4,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: theme.text.secondary,
  },

  card: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    overflow: 'hidden',
  },

  divider: {
    height: 1,
    backgroundColor: theme.border.default,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.l,
    gap: theme.spacing.m,
  },
  rowCol: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...theme.typography.h4,
    color: theme.text.primary,
  },
  rowSubtitle: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  // Subscription badges
  upgradeBadge: {
    backgroundColor: theme.surface.premiumSubtle,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  upgradeBadgeLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.premium,
  },
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

  // Toggle
  toggleWrap: {
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  toggleLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  toggleLabelOn:  { color: theme.text.success },
  toggleLabelOff: { color: theme.text.secondary },
});
