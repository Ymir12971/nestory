import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';
import { setDevSession, useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient, isSupabaseAuthAvailable } from '@/features/auth/supabaseClient';

// Demo userId for the dev escape hatch (Supabase envs not configured); matches
// the seed user in apps/nestory-api/prisma/seed.ts.
const DEMO_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

export function SignInScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<'apple' | 'google' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailPending, setEmailPending] = useState(false);
  const supabaseReady = isSupabaseAuthAvailable();
  const busy = pendingProvider != null || emailPending;

  // On web, signInWithOAuth navigates the whole page away to the provider and
  // back, landing on this screen again with the Supabase session already
  // restored — no explicit navigation runs in that flow. Redirect once a real
  // session appears. Dev sessions carry a null accessToken and are navigated
  // by handleDevSignIn, so they don't trigger this.
  useEffect(() => {
    if (session?.accessToken) {
      router.replace('/onboarding/profile');
    }
  }, [session?.accessToken, router]);

  const blurFocus = () => {
    // Avoids React Navigation aria-hidden warning when a Pressable keeps focus.
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement | null)?.blur();
    }
  };

  const handleDevSignIn = () => {
    blurFocus();
    setDevSession({ userId: DEMO_USER_ID });
    router.replace('/onboarding/profile');
  };

  const handleOAuthSignIn = async (provider: 'apple' | 'google') => {
    blurFocus();
    setError(null);
    const sb = getSupabaseClient();
    if (!sb) {
      handleDevSignIn();
      return;
    }
    setPendingProvider(provider);
    try {
      // expo-auth-session computes the right callback URL across web/dev/native
      // (https://auth.expo.io proxy on Expo Go, custom scheme on standalone, current
      // origin on web). Each variant must be listed as an allowed redirect in
      // Supabase Auth → URL Configuration.
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'nestory' });
      const { data, error: sbErr } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
      });
      if (sbErr) throw sbErr;

      if (Platform.OS === 'web') {
        // signInWithOAuth navigates the page itself in browser environments.
        return;
      }

      // Native: open the URL Supabase returned and wait for the deep-link back.
      if (!data?.url) throw new Error('Supabase returned no auth URL');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        setPendingProvider(null);
        return;
      }
      // PKCE: extract the ?code= from the deep link and exchange it for a session.
      const code = new URL(result.url).searchParams.get('code');
      if (!code) throw new Error('Missing OAuth code in callback URL');
      const { error: exchErr } = await sb.auth.exchangeCodeForSession(code);
      if (exchErr) throw exchErr;
      router.replace('/onboarding/profile');
    } catch (e: any) {
      setError(e?.message ?? 'Sign-in failed. Please try again.');
    } finally {
      setPendingProvider(null);
    }
  };

  const handleApplePress  = () => (supabaseReady ? handleOAuthSignIn('apple')  : handleDevSignIn());
  const handleGooglePress = () => (supabaseReady ? handleOAuthSignIn('google') : handleDevSignIn());

  // Email + password sign-in. Works on any device (no browser / Google / GMS)
  // — the reliable path for no-GMS phones and mainland users. The useSession
  // effect above handles the redirect once the session lands.
  const handleEmailSignIn = async () => {
    blurFocus();
    setError(null);
    const sb = getSupabaseClient();
    if (!sb) { handleDevSignIn(); return; }
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setEmailPending(true);
    try {
      const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message ?? 'Sign-in failed. Please try again.');
    } finally {
      setEmailPending(false);
    }
  };

  return (
    <LinearGradient
      colors={[palette.primary[600], palette.primary[400]]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top white card: photo + logo */}
        <View style={styles.card}>
          <Image
            source={require('@/assets/images/family-trip-1.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <Image
            source={require('@/assets/images/nestory-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.headline}>Welcome to Nestory</Text>
          <Text style={styles.subtitle}>
            Sign in to start capturing your little one's story
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <Pressable
            style={({ pressed }) => [styles.socialButton, (pressed || busy) && styles.pressed]}
            onPress={handleApplePress}
            disabled={busy}
          >
            <RemixIcon name="apple-fill" size={22} color={theme.text.brand} />
            <Text style={styles.socialButtonLabel}>
              {pendingProvider === 'apple' ? 'Signing in…' : 'Continue with Apple'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.socialButton, (pressed || busy) && styles.pressed]}
            onPress={handleGooglePress}
            disabled={busy}
          >
            <RemixIcon name="google-fill" size={20} color={theme.text.brand} />
            <Text style={styles.socialButtonLabel}>
              {pendingProvider === 'google' ? 'Signing in…' : 'Continue with Google'}
            </Text>
          </Pressable>

          {/* Email + password — works on any device, no Google/GMS needed */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.text.hint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={theme.text.hint}
            secureTextEntry
            autoCapitalize="none"
            editable={!busy}
            onSubmitEditing={handleEmailSignIn}
            returnKeyType="go"
          />
          <Pressable
            style={({ pressed }) => [styles.emailButton, (pressed || busy) && styles.pressed]}
            onPress={handleEmailSignIn}
            disabled={busy}
          >
            <Text style={styles.emailButtonLabel}>
              {emailPending ? 'Signing in…' : 'Sign in with Email'}
            </Text>
          </Pressable>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>By continuing, you agree to our</Text>
          <Text style={styles.footerText}>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/onboarding/terms')}
            >
              Terms of Service
            </Text>
            {' and '}
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/onboarding/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: theme.surface.default,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.l,
    gap: theme.spacing.l,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 400 / 236,
    borderRadius: theme.radius.m,
  },
  logo: {
    width: 149,
    height: 49,
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 50,
    gap: theme.spacing.s,
    alignItems: 'center',
  },
  headline: {
    ...theme.typography.h1,
    color: theme.text.onColor,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.text.onBrandSubtle,
    textAlign: 'center',
  },
  buttonGroup: {
    paddingTop: theme.spacing.l,
    gap: theme.spacing.s,
    alignItems: 'center',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    backgroundColor: theme.surface.default,
    height: 52,
    width: 290,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.brand,
  },
  pressed: {
    opacity: 0.85,
  },
  socialButtonLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    width: 290,
    marginVertical: theme.spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dividerText: {
    ...theme.typography.caption,
    color: theme.text.onBrandSubtle,
  },
  input: {
    width: 290,
    height: 48,
    backgroundColor: theme.surface.default,
    borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.m,
    color: theme.text.primary,
    ...theme.typography.body,
  },
  emailButton: {
    width: 290,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
  },
  emailButtonLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.text.onColor,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.s,
    textAlign: 'center',
    maxWidth: 290,
  },
  devNoticeText: {
    ...theme.typography.caption,
    color: theme.text.onBrandSubtle,
    textAlign: 'center',
    maxWidth: 290,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.xs,
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.text.onBrandSubtle,
    textAlign: 'center',
  },
  footerLink: {
    fontFamily: 'Manrope_600SemiBold',
    color: theme.text.onBrandEmphasis,
  },
});
