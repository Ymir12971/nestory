import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSession } from '@/features/auth/hooks/useSession';
import { completeOAuthSignIn, routeAfterSignIn } from '@/features/auth/oauth';
import { showToast } from '@/features/ui/toast';
import { theme } from '@/shared/theme';

export default function Index() {
  const { session, isLoading } = useSession();

  // An OAuth provider's redirect (nestory:///?code=…) reaches the app as a deep
  // link, and the router resolves it to this route. On Android that is the only
  // dependable sign that the round trip finished: the browser helper the
  // sign-in screen awaits usually reports "dismiss", because the app resuming
  // beats the link event. So the sign-in is completed here. Without this the
  // user came back from a successful Google sign-in to the welcome carousel,
  // still signed out.
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const code = typeof params.code === 'string' ? params.code : undefined;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!code) return;
    completeOAuthSignIn(code)
      .then(() => routeAfterSignIn())
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Please try again.';
        showToast({ type: 'error', message: `Sign-in failed: ${msg}`, duration: 5000 });
        setFailed(true);
      });
  }, [code]);

  if (code) {
    if (failed) return <Redirect href="/onboarding/auth" />;
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.text.brand} />
      </View>
    );
  }

  if (isLoading) return null;

  return session
    ? <Redirect href="/(tabs)" />
    : <Redirect href="/onboarding/welcome" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface.default,
  },
});
