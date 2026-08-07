import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import type { Child, SubscriptionStatus } from '@nestory/types';
import { palette, theme } from '@/shared/theme';
import { Button } from '@/shared/components/Button';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Toggle } from '@/shared/components/Toggle';
import { PaywallModal } from '@/shared/components/PaywallModal';
import { useMe, useSubscription, useChildren, useUpdateMe } from '@/api';
import { formatAge } from '@/shared/lib/formatAge';

const GENDER_LABEL: Record<string, string> = { girl: 'Girl', boy: 'Boy' };

/** "2y 4mo old, Girl" — gender omitted for prefer_not_to_say. */
function childSubtitle(child: Child): string {
  const age = formatAge(child.birthDate);
  const gender = child.gender ? GENDER_LABEL[child.gender] : undefined;
  return gender ? `${age}, ${gender}` : age;
}

// ---------- Subscription entry derivation ----------

function getSubEntry(
  sub: SubscriptionStatus,
  expiresAt: string | null,
  quotaRemaining: number | null,
): {
  label: string;
  subtitle: string;
  badge: string;
  badgeVariant: 'upgrade' | 'active' | 'renew';
} {
  const dateStr = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  if (sub === 'premium_active' || sub === 'trial_active') {
    return { label: 'Premium', subtitle: `Renews ${dateStr}`, badge: 'Active', badgeVariant: 'active' };
  }
  if (sub === 'trial_ended' || sub === 'premium_ended') {
    return { label: 'Premium', subtitle: `Expired ${dateStr}`, badge: 'Renew', badgeVariant: 'renew' };
  }
  // Free: card shows how many of the 2 story credits remain (annotation:
  // "0 Stories remaining" when exhausted).
  const remaining = quotaRemaining ?? 0;
  return {
    label: 'Free Plan',
    subtitle: `${remaining} ${remaining === 1 ? 'Story' : 'Stories'} remaining`,
    badge: 'Upgrade',
    badgeVariant: 'upgrade',
  };
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
    // Toggle rows are top-aligned in the design (768:4638), and the DS Toggle
    // carries no On/Off caption
    <View style={[styles.row, styles.rowTop]}>
      <View style={styles.rowCol}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  );
}

// ---------- Screen ----------

export function SettingsScreen() {
  const router = useRouter();
  const meQ        = useMe();
  const subQ       = useSubscription();
  const childrenQ  = useChildren();

  // Both toggles persist to the user row (push delivery checks them server-side).
  // Story Notifications additionally can't be on without OS permission.
  const updateMe = useUpdateMe();
  const [storyNotif, setStoryNotif]     = useState(false);
  const [uploadRemind, setUploadRemind] = useState(true);
  // TODO: Story Location should follow the OS location permission once the
  // location capture feature lands (annotation: 系统定位打开则跟随打开).
  const [location, setLocation]         = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Seed from the server, then AND the story toggle with OS permission.
  useEffect(() => {
    if (!meQ.data) return;
    setUploadRemind(meQ.data.uploadRemindersEnabled);
    void Notifications.getPermissionsAsync().then(res => {
      setStoryNotif(meQ.data!.storyNotificationsEnabled && res.granted);
    });
  }, [meQ.data]);

  const onToggleStoryNotif = (v: boolean) => {
    setStoryNotif(v);
    updateMe.mutate({ storyNotificationsEnabled: v });
  };
  const onToggleUploadRemind = (v: boolean) => {
    setUploadRemind(v);
    updateMe.mutate({ uploadRemindersEnabled: v });
  };

  if (meQ.isLoading || subQ.isLoading || childrenQ.isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ActivityIndicator color={theme.text.brand} />
      </SafeAreaView>
    );
  }

  if (meQ.isError || subQ.isError || childrenQ.isError || !meQ.data || !subQ.data) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <Text style={styles.errorText}>Failed to load settings.</Text>
        <Pressable onPress={() => { meQ.refetch(); subQ.refetch(); childrenQ.refetch(); }}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const me  = meQ.data;
  const sub = subQ.data;
  const childrenList = childrenQ.data;
  const activeChild  = childrenList?.find(c => c.isActive) ?? childrenList?.[0];

  const subEntry = getSubEntry(sub.subscriptionStatus, sub.expiresAt, sub.storyQuotaRemaining);

  const handleSubEntryPress = () => {
    if (sub.subscriptionStatus === 'trial_ended' || sub.subscriptionStatus === 'premium_ended') {
      setPaywallVisible(true);
    } else {
      router.push('/settings/subscription');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* header 768:4583 — tab root, so no back arrow; hairline underneath */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Promo card 768:4588 — blue gradient with a coin tile, no section label */}
        <Pressable
          style={({ pressed }) => pressed && { opacity: 0.9 }}
          onPress={() => router.push('/settings/feedback')}
        >
          <LinearGradient
            colors={['#6790ff', '#2660e7']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.promoCard}
          >
            <View style={styles.promoIconTile}>
              <RemixIcon name="money-dollar-circle-fill" size={32} color="#2660e7" />
            </View>
            <Text style={styles.promoTitle}>
              Share feedback, Earn <Text style={styles.promoAccent}>10% off</Text>.
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Child Profile 768:4598 — every child, with "+Add child" on the label row */}
        <View style={styles.group}>
          <View style={styles.sectionLabelWrap}>
            <Text style={styles.sectionLabel}>Child Profile</Text>
            <Pressable hitSlop={8} onPress={() => router.push('/onboarding/profile?another=1')}>
              <Text style={styles.sectionAction}>+Add child</Text>
            </Pressable>
          </View>
          <Card>
            {(childrenList ?? []).map((child, i) => (
              <View key={child.id}>
                {i > 0 && <Divider />}
                <Pressable
                  style={styles.row}
                  onPress={() => router.push(`/settings/profiles/${child.id}`)}
                >
                  {child.avatarUrl ? (
                    <Image source={{ uri: child.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatar} />
                  )}
                  <View style={styles.rowCol}>
                    <Text style={styles.childName}>{child.name}</Text>
                    <Text style={styles.rowSubtitle}>{childSubtitle(child)}</Text>
                  </View>
                  {child.isActive && <StatusBadge type="active" label="Active" />}
                  <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
                </Pressable>
              </View>
            ))}
          </Card>
        </View>

        {/* Current Plan 768:4625 — plan + quota, with a DS Small action button */}
        <View style={styles.group}>
          <SectionLabel label="Current Plan" />
          <Card>
            <View style={styles.row}>
              <View style={styles.rowCol}>
                <Text style={styles.rowLabel}>{subEntry.label}</Text>
                <Text style={styles.rowSubtitle}>{subEntry.subtitle}</Text>
              </View>
              <Button
                label={subEntry.badge}
                type="small"
                style={styles.planAction}
                onPress={handleSubEntryPress}
              />
            </View>
          </Card>
        </View>

        {/* Notifications 768:4634 */}
        <View style={styles.group}>
          <SectionLabel label="Notifications" />
          <Card>
            <ToggleRow
              label="Story Notifications"
              subtitle="Get notified when your Story is ready"
              value={storyNotif}
              onValueChange={onToggleStoryNotif}
            />
            <Divider />
            <ToggleRow
              label="Upload Reminders"
              subtitle="Gentle reminders every 3 days"
              value={uploadRemind}
              onValueChange={onToggleUploadRemind}
            />
          </Card>
        </View>

        {/* Story 768:4649 */}
        <View style={styles.group}>
          <SectionLabel label="Story" />
          <Card>
            {/* TODO(justin): when On + iOS authorized, persist optional `location` field via backend */}
            <ToggleRow
              label="Story · Location"
              subtitle="For enriching monthly Stories."
              value={location}
              onValueChange={setLocation}
            />
          </Card>
        </View>

        {/* More 768:4658 — Account lives here; the promo card is the Feedback entry */}
        <View style={styles.group}>
          <SectionLabel label="More" />
          <Card>
            <NavRow label="Account" onPress={() => router.push('/settings/account')} />
            <Divider />
            <NavRow label="Data & Privacy" onPress={() => router.push('/settings/privacy')} />
            <Divider />
            <NavRow label="About Nestory" onPress={() => router.push('/settings/about')} />
          </Card>
        </View>
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
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
  center: {
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
  // header 768:4583 — px20 / py16 + border/default hairline, H2, no back arrow
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.default,
  },
  headerTitle: {
    ...theme.typography.h2, // Manrope Bold 18/24
    color: theme.text.primary,
  },

  scroll: { flex: 1 },
  body: {
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.xxl, // 24 between groups
  },

  // group 768:4587 — label and card sit 4 apart
  group: { gap: theme.spacing.xs },

  sectionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    paddingLeft: 4,
  },
  sectionLabel: {
    ...theme.typography.tagBadge, // Inter Medium 14/16
    color: theme.text.secondary,
  },
  // 816:3362 — "+Add child" on the Child Profile label row
  sectionAction: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

  card: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m, // 10
    overflow: 'hidden',
  },

  divider: {
    height: 1,
    backgroundColor: theme.border.default,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.l, // 16
    gap: theme.spacing.m, // 12
  },
  rowTop: { alignItems: 'flex-start' },
  rowCol: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...theme.typography.h4, // Manrope SemiBold 14/20
    color: theme.text.primary,
  },
  // 768:4608 — a child's name is Heading3, larger than a settings row label
  childName: {
    ...theme.typography.h3,
    color: theme.text.primary,
  },
  rowSubtitle: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
    borderWidth: 1,
    borderColor: theme.border.strong,
  },

  // Current Plan action — DS Small button
  planAction: { alignSelf: 'center' },

  // Promo card 768:4588 — blue gradient, 2px #c6d7ff edge, radius/m
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    borderWidth: 2,
    borderColor: '#c6d7ff',
    borderRadius: theme.radius.m,
    padding: theme.spacing.l,
    overflow: 'hidden',
  },
  promoIconTile: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.m,
    backgroundColor: '#e0e9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: {
    ...theme.typography.h2, // Manrope Bold 18/24
    color: theme.text.onColor,
    flex: 1,
  },
  promoAccent: { color: palette.accent[400] }, // #fbbf24
});
