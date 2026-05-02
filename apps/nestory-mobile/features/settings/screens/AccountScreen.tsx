import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';

// ---------- Mock data — replace with real auth context ----------

const MOCK_LINKED: { provider: 'apple' | 'google'; label: string; email: string; connected: boolean }[] = [
  { provider: 'apple',  label: 'Apple',  email: 'sarah.j@icloud.com', connected: true  },
  { provider: 'google', label: 'Google', email: 'Not connected',       connected: false },
];

const PROVIDER_ICON = { apple: 'apple-fill', google: 'google-fill' } as const;

export function AccountScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Account</Text>
        <View style={styles.navSpacer} />
      </View>

      <View style={styles.body}>
        {/* LINKED ACCOUNTS section label */}
        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabel}>LINKED ACCOUNTS</Text>
        </View>

        {/* Linked accounts card */}
        <View style={styles.card}>
          {MOCK_LINKED.map((acct, i) => (
            <View key={acct.provider}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <RemixIcon
                  name={PROVIDER_ICON[acct.provider]}
                  size={24}
                  color={theme.text.primary}
                />
                <View style={styles.col}>
                  <Text style={[styles.acctLabel, !acct.connected && { color: theme.text.secondary }]}>
                    {acct.label}
                  </Text>
                  <Text style={styles.acctEmail}>{acct.email}</Text>
                </View>
                {acct.connected && (
                  <View style={styles.connectedBadge}>
                    <Text style={styles.connectedBadgeLabel}>Connected</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Actions card */}
        <View style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={() => { /* TODO: sign out via auth provider, clear session, navigate to onboarding */ }}
          >
            <RemixIcon name="logout-box-r-line" size={20} color={theme.text.primary} />
            <Text style={[styles.acctLabel, { flex: 1 }]}>Log Out</Text>
            <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.row}
            onPress={() => { /* TODO: confirm dialog → DELETE /account */ }}
          >
            <RemixIcon name="delete-bin-line" size={20} color={theme.text.error} />
            <Text style={[styles.acctLabel, { color: theme.text.error, flex: 1 }]}>Delete Account</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

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

  body: {
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.l,
  },

  sectionLabelWrap: { paddingBottom: 4, paddingLeft: 4 },
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
  divider: { height: 1, backgroundColor: theme.border.default },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.l,
    gap: theme.spacing.m,
  },
  col: { flex: 1, gap: 2 },
  acctLabel: { ...theme.typography.h4, color: theme.text.primary },
  acctEmail: { ...theme.typography.caption, color: theme.text.secondary },

  connectedBadge: {
    backgroundColor: theme.surface.successSubtle,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  connectedBadgeLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.success,
  },
});
