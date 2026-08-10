import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '@/shared/theme';
import { Button } from '@/shared/components/Button';
import { queryClient, resetUnauthorizedGuard, restoreMe } from '@/api';
import { forceSignOut } from '@/features/auth/signOut';
import { showToast } from '@/features/ui/toast';

/**
 * Shown when signing in lands on an account that was deleted but not yet
 * purged. Google and Apple keep authenticating the identity until the purge
 * removes the Supabase Auth user, so without this screen the user signs in
 * successfully and is bounced straight back to sign-in with no explanation.
 *
 * Off-spec: the redesign file has no frame for this state. Built from DS atoms
 * in the app's own language.
 */
export function AccountDeletedScreen() {
  const { purgeAt } = useLocalSearchParams<{ purgeAt?: string }>();
  const [restoring, setRestoring] = useState(false);

  const deadline = purgeAt ? new Date(purgeAt) : null;
  const deadlineLabel =
    deadline && !Number.isNaN(deadline.getTime())
      ? deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      await restoreMe();
      // Everything cached during the locked-out period is 401s.
      queryClient.clear();
      resetUnauthorizedGuard();
      showToast({ type: 'success', message: 'Welcome back — your account is restored.' });
      router.replace('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Please try again.';
      showToast({ type: 'error', message: `Couldn't restore your account: ${msg}` });
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <RemixIcon name="error-warning-line" size={32} color={theme.text.warning} />
        </View>

        <Text style={styles.title}>This account was deleted</Text>
        <Text style={styles.paragraph}>
          {deadlineLabel
            ? `Your Stories, Moments and Profiles are still here, but they'll be permanently deleted on ${deadlineLabel}. You can bring the account back until then.`
            : `Your Stories, Moments and Profiles are still here, but they're scheduled for permanent deletion. You can bring the account back until then.`}
        </Text>
      </View>

      <View style={styles.cta}>
        <Button
          label={restoring ? 'Restoring…' : 'Restore My Account'}
          disabled={restoring}
          onPress={() => void handleRestore()}
        />
        {/* Not "Sign Out" — the user just signed IN and landed here, so being
            offered a sign-out reads backwards. It does end the session, but
            what the user is choosing is to go back and use another account. */}
        <Button
          label="Back to Sign In"
          type="text"
          style={styles.textBtn}
          disabled={restoring}
          onPress={() => void forceSignOut()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl, // 20
    gap: theme.spacing.l, // 16
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.warningSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.primary,
  },
  paragraph: {
    ...theme.typography.body, // Inter Regular 16/20
    color: theme.text.secondary,
    lineHeight: 22,
  },
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.s, // 8
    gap: theme.spacing.l, // 16
    alignItems: 'center',
  },
  textBtn: { height: 44 },
});
