import { router } from 'expo-router';
import { ApiClientError, listChildren, queryClient, queryKeys } from '@/api';
import { identify, track } from '@/shared/lib/analytics';
import { getSupabaseClient } from './supabaseClient';

type OAuthProvider = 'apple' | 'google';

let routing: Promise<void> | null = null;

/**
 * Sends a just-signed-in user where they belong: home if the account already
 * has a child, onboarding if not. A returning user sent through onboarding
 * sees an empty profile form — it reads as lost data, and filling it in creates
 * a duplicate child. If the lookup fails, fall back to onboarding rather than
 * leave the user where they are.
 *
 * Callers overlap (the sign-in screen reacting to the new session, and whoever
 * finished an OAuth round trip), so one lookup in flight serves them all.
 */
export function routeAfterSignIn(): Promise<void> {
  routing ??= queryClient
    .fetchQuery({ queryKey: queryKeys.children, queryFn: listChildren, staleTime: 0 })
    .then(
      (children) => children.length > 0,
      // A 401 belongs to the unauthorized handler — an expired session, or a
      // deleted account, which gets its own page. Navigating here would race it.
      (e: unknown) => (e instanceof ApiClientError && e.statusCode === 401 ? null : false),
    )
    .then((hasChild) => {
      if (hasChild === null) return;
      router.replace(hasChild ? '/' : '/onboarding/privacy-claim');
    })
    .finally(() => {
      routing = null;
    });
  return routing;
}

let pendingProvider: OAuthProvider | null = null;

/** Call before opening the provider's page, so whoever gets the redirect knows which provider it was. */
export function noteOAuthStarted(provider: OAuthProvider): void {
  pendingProvider = provider;
}

export function oauthCodeFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get('code');
  } catch {
    return null;
  }
}

const exchanges = new Map<string, Promise<void>>();

/**
 * Turns the `code` an OAuth redirect carries into a session (PKCE).
 *
 * On Android two places can receive the same redirect: the sign-in screen, if
 * the browser helper hands the URL back, and app/index.tsx, which the router
 * opens for the deep link. The code is single-use, so the second caller gets
 * the first one's promise instead of a second exchange.
 */
export function completeOAuthSignIn(code: string): Promise<void> {
  let exchange = exchanges.get(code);
  if (!exchange) {
    exchange = (async () => {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Sign-in is not available.');
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw error;
      if (data?.session?.user?.id) identify(data.session.user.id);
      track('signup_success', { method: pendingProvider ?? 'google' });
      pendingProvider = null;
    })();
    exchanges.set(code, exchange);
  }
  return exchange;
}
