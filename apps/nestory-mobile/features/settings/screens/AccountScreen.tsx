import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import type { LinkedProvider } from '@nestory/types';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { useMe, useDeleteMe, useSubscription } from '@/api';
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
  const subQ = useSubscription();
  const deleteMe = useDeleteMe();
  const qc = useQueryClient();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const isPremium =
    subQ.data?.subscriptionStatus === 'premium_active' ||
    subQ.data?.subscriptionStatus === 'trial_active';
  // ST-07 Delete Account: button arms only on the exact uppercase word.
  const deleteArmed = deleteInput === 'DELETE';

  const handleLogOut = async () => {
    setLogoutVisible(false);
    const sb = getSupabaseClient();
    if (sb) await sb.auth.signOut();
    await logOutPurchaseUser();
    setDevSession(null);
    qc.clear();
    router.replace('/onboarding/auth');
  };

  const confirmDelete = async () => {
    if (!deleteArmed || deleteMe.isPending) return;
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
          <Pressable style={styles.row} onPress={() => setLogoutVisible(true)}>
            <RemixIcon name="logout-box-r-line" size={20} color={theme.text.primary} />
            <Text style={[styles.acctLabel, { flex: 1 }]}>Log Out</Text>
            <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.row}
            onPress={() => { setDeleteInput(''); setDeleteVisible(true); }}
            disabled={deleteMe.isPending}
          >
            <RemixIcon name="delete-bin-line" size={20} color={theme.text.error} />
            <Text style={[styles.acctLabel, { color: theme.text.error, flex: 1 }]}>
              {deleteMe.isPending ? 'Deleting…' : 'Delete Account'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ST-07 / Sheet · Logout Confirm */}
      <Modal visible={logoutVisible} transparent animationType="slide" onRequestClose={() => setLogoutVisible(false)}>
        <Pressable style={styles.scrim} onPress={() => setLogoutVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Log out of Nestory?</Text>
          <Text style={styles.sheetBody}>You can always sign back in with the same account.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => void handleLogOut()}>
            <Text style={styles.primaryBtnLabel}>Log Out</Text>
          </Pressable>
          <Pressable style={styles.textBtn} onPress={() => setLogoutVisible(false)}>
            <Text style={styles.textBtnLabel}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ST-07 / Sheet · Delete Account Confirm (Premium adds the subscription
          notice — v2 per annotation; older popup without it is 作废) */}
      <Modal visible={deleteVisible} transparent animationType="slide" onRequestClose={() => setDeleteVisible(false)}>
        <Pressable style={styles.scrim} onPress={() => setDeleteVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Delete your account?</Text>
          <Text style={styles.sheetBody}>
            All your data — Stories, Memories, Profiles — will be permanently removed. This can't be undone.
          </Text>

          {isPremium && (
            <View style={styles.subNotice}>
              <RemixIcon name="error-warning-line" size={20} color={theme.text.warning} />
              <View style={styles.subNoticeText}>
                <Text style={styles.subNoticeTitle}>Your subscription won't cancel automatically</Text>
                <Text style={styles.subNoticeBody}>
                  Deleting your account doesn't cancel your Premium subscription. Please cancel it in your App Store or Google Play settings to avoid future charges.
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.confirmHint}>Type "DELETE" to confirm</Text>
          <TextInput
            style={styles.confirmInput}
            value={deleteInput}
            onChangeText={setDeleteInput}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="DELETE"
            placeholderTextColor={theme.text.hint}
          />
          <Pressable
            style={[styles.deleteBtn, !deleteArmed && styles.deleteBtnDisabled]}
            onPress={() => { setDeleteVisible(false); void confirmDelete(); }}
            disabled={!deleteArmed || deleteMe.isPending}
          >
            <Text style={[styles.deleteBtnLabel, !deleteArmed && styles.deleteBtnLabelDisabled]}>
              {deleteMe.isPending ? 'Deleting…' : 'Delete Account'}
            </Text>
          </Pressable>
          <Pressable style={styles.textBtn} onPress={() => setDeleteVisible(false)}>
            <Text style={styles.textBtnLabel}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
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

  // Sheets (logout / delete confirm)
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: theme.surface.card,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm + theme.spacing.l,
    gap: theme.spacing.m,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border.strong,
    alignSelf: 'center',
    marginBottom: theme.spacing.s,
  },
  sheetTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: theme.text.primary,
  },
  sheetBody: {
    ...theme.typography.body,
    color: theme.text.secondary,
    lineHeight: 22,
  },
  primaryBtn: {
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.s,
  },
  primaryBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  textBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.secondary,
  },
  subNotice: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    backgroundColor: theme.surface.warningSubtle,
    borderRadius: theme.radius.m,
    padding: theme.spacing.l,
  },
  subNoticeText: { flex: 1, gap: 4 },
  subNoticeTitle: {
    ...theme.typography.h4,
    color: theme.text.primary,
  },
  subNoticeBody: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    lineHeight: 18,
  },
  confirmHint: {
    ...theme.typography.h4,
    color: theme.text.primary,
  },
  confirmInput: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  deleteBtn: {
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: theme.text.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnDisabled: {
    backgroundColor: theme.border.default,
  },
  deleteBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  deleteBtnLabelDisabled: {
    color: theme.text.hint,
  },
});
