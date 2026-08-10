import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import type { LinkedProvider } from '@nestory/types';
import { theme } from '@/shared/theme';
import { BottomSheet, sheetSection } from '@/shared/components/BottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { NavBar } from '@/shared/components/NavBar';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { forceSignOut } from '@/features/auth/signOut';
import { useMe, useDeleteMe, useSubscription } from '@/api';
import { showToast } from '@/features/ui/toast';

const PROVIDERS: { key: 'apple' | 'google'; label: string }[] = [
  { key: 'apple',  label: 'Apple'  },
  { key: 'google', label: 'Google' },
];
const PROVIDER_ICON = { apple: 'apple-fill', google: 'google-fill' } as const;

export function AccountScreen() {
  const goBack = useGoBack();
  const meQ = useMe();
  const subQ = useSubscription();
  const deleteMe = useDeleteMe();
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
    await forceSignOut();
  };

  const confirmDelete = async () => {
    if (!deleteArmed || deleteMe.isPending) return;
    try {
      await deleteMe.mutateAsync();
      showToast({ type: 'success', message: 'Account deleted.' });
      await forceSignOut();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Please try again.';
      showToast({ type: 'error', message: `Couldn't delete account: ${msg}` });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar title="Account" onBack={goBack} />

      {/* body 770:2607 — two cards, 16 apart; the design has no section label */}
      <View style={styles.body}>
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
                    {linked && <StatusBadge type="active" label="Connected" />}
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

      {/* ST-07 / Sheet · Logout Confirm (770:3145) — headline and its line of
          reassurance share one title block, 12 apart; there is no body block. */}
      <BottomSheet visible={logoutVisible} onRequestClose={() => setLogoutVisible(false)}>
        <View style={sheetSection.title}>
          <View style={styles.sheetTitleStack}>
            <Text style={styles.sheetTitle}>Log out of Nestory?</Text>
            <Text style={styles.sheetSubtitle}>You can always sign back in with the same account.</Text>
          </View>
        </View>
        {/* cta 775:2586 — the safe action is the primary; logging out is the
            quiet destructive text button underneath. */}
        <View style={sheetSection.cta}>
          <Button label="Stay Signed In" onPress={() => setLogoutVisible(false)} />
          <Button
            label="Log Out"
            type="destructive"
            style={styles.sheetTextBtn}
            onPress={() => void handleLogOut()}
          />
        </View>
      </BottomSheet>

      {/* ST-07 / Sheet · Delete Account Confirm (Premium adds the subscription
          notice — v2 per annotation; older popup without it is 作废) */}
      <BottomSheet visible={deleteVisible} onRequestClose={() => setDeleteVisible(false)}>
        <View style={sheetSection.title}>
          <View style={styles.sheetTitleStack}>
            <Text style={styles.sheetTitle}>Delete your account?</Text>
            {/* Copy tracks what the backend actually does: lock out now, purge
                on day 30 (accountPurge.ts), restorable by signing back in until
                then (方案 B). The design's "permanently removed / can't be
                undone" wording described neither half of that. */}
            <Text style={styles.sheetSubtitle}>
              You'll be signed out right away. Your Stories, Moments and Profiles are permanently
              deleted after 30 days — until then you can change your mind by signing back in.
            </Text>
          </View>
        </View>
        <View style={[sheetSection.body, styles.deleteBody]}>
          {isPremium && (
            <View style={styles.subNotice}>
              <RemixIcon name="error-warning-line" size={20} color={theme.text.warning} />
              <View style={styles.subNoticeText}>
                <Text style={styles.subNoticeTitle}>Your subscription won't cancel automatically</Text>
                <Text style={styles.subNoticeBody}>
                  Deleting your account doesn't cancel your Premium subscription. Please cancel it in
                  your App Store or Google Play settings to avoid future charges.
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.confirmHint}>Type "DELETE" to confirm</Text>
          <Input
            value={deleteInput}
            onChangeText={setDeleteInput}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="DELETE"
          />
        </View>
        {/* cta 775:2629 — "Keep My Account" is the primary; deleting stays a
            quiet text button that only turns red once DELETE is typed. */}
        <View style={sheetSection.cta}>
          <Button label="Keep My Account" onPress={() => setDeleteVisible(false)} />
          <Button
            label={deleteMe.isPending ? 'Deleting…' : 'Delete Account'}
            type="destructive"
            style={styles.sheetTextBtn}
            disabled={!deleteArmed || deleteMe.isPending}
            onPress={() => {
              setDeleteVisible(false);
              void confirmDelete();
            }}
          />
        </View>
      </BottomSheet>
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
  // Sheet titles across the redesign are Heading1 on text/primary bodies
  sheetTitle: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.primary,
  },
  /** title block holds headline + subtitle 12 apart (770:3149, 770:3157) */
  sheetTitleStack: { gap: theme.spacing.m },
  sheetSubtitle: {
    ...theme.typography.body, // Inter Regular 16/20
    color: theme.text.secondary,
  },
  /** the destructive text button in confirm sheets is 44 tall, not the DS 40 */
  sheetTextBtn: { height: 44 },
  deleteBody: { gap: theme.spacing.s }, // 8
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
  // 770:3163 — the confirm prompt is Body, not a heading
  confirmHint: {
    ...theme.typography.body, // Inter Regular 16/20
    color: theme.text.primary,
  },
});
