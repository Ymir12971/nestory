import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import type { LinkedProvider } from '@nestory/types';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { useMe, useDeleteMe } from '@/api';
import { setDevSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/features/auth/supabaseClient';
import { logOutPurchaseUser } from '@/features/billing/purchases';
import { showToast } from '@/features/ui/toast';

const PROVIDERS: { key: 'apple' | 'google'; label: string }[] = [
  { key: 'apple',  label: 'Apple'  },
  { key: 'google', label: 'Google' },
];
const PROVIDER_ICON = { apple: 'apple-fill', google: 'google-fill' } as const;

export function AccountScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const meQ = useMe();
  const deleteMe = useDeleteMe();
  const qc = useQueryClient();

  const handleLogOut = async () => {
    const sb = getSupabaseClient();
    if (sb) await sb.auth.signOut();
    await logOutPurchaseUser();
    setDevSession(null);
    qc.clear();
    router.replace('/onboarding/auth');
  };

  const confirmDelete = async () => {
    try {
      await deleteMe.mutateAsync();
      const sb = getSupabaseClient();
      if (sb) await sb.auth.signOut();
      await logOutPurchaseUser();
      setDevSession(null);
      qc.clear();
      showToast({ type: 'success', message: 'Account deleted.' });
      router.replace('/onboarding/auth');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Please try again.';
      showToast({ type: 'error', message: `Couldn't delete account: ${msg}` });
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently removes your account, children, memories, and stories. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Account</Text>
        <View style={styles.navSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabel}>LINKED ACCOUNTS</Text>
        </View>

        {meQ.isLoading ? (
          <View style={styles.card}>
            <View style={styles.row}><ActivityIndicator color={theme.text.brand} /></View>
          </View>
        ) : meQ.isError || !meQ.data ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.acctEmail, { flex: 1 }]}>Failed to load.</Text>
              <Pressable onPress={() => meQ.refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            {PROVIDERS.map((p, i) => {
              const linked: LinkedProvider | undefined =
                meQ.data!.linkedProviders.find(lp => lp.provider === p.key);
              return (
                <View key={p.key}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <RemixIcon
                      name={PROVIDER_ICON[p.key]}
                      size={24}
                      color={theme.text.primary}
                    />
                    <View style={styles.col}>
                      <Text style={[styles.acctLabel, !linked && { color: theme.text.secondary }]}>
                        {p.label}
                      </Text>
                      <Text style={styles.acctEmail}>
                        {linked
                          ? (linked.providerEmail ?? 'Email hidden')
                          : 'Not connected'}
                      </Text>
                    </View>
                    {linked && (
                      <View style={styles.connectedBadge}>
                        <Text style={styles.connectedBadgeLabel}>Connected</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.card}>
          <Pressable style={styles.row} onPress={handleLogOut}>
            <RemixIcon name="logout-box-r-line" size={20} color={theme.text.primary} />
            <Text style={[styles.acctLabel, { flex: 1 }]}>Log Out</Text>
            <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.row}
            onPress={handleDeleteAccount}
            disabled={deleteMe.isPending}
          >
            <RemixIcon name="delete-bin-line" size={20} color={theme.text.error} />
            <Text style={[styles.acctLabel, { color: theme.text.error, flex: 1 }]}>
              {deleteMe.isPending ? 'Deleting…' : 'Delete Account'}
            </Text>
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
  retryText: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

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
