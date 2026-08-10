import { router } from 'expo-router';
import { queryClient, resetUnauthorizedGuard } from '@/api/queryClient';
import { getSupabaseClient } from '@/features/auth/supabaseClient';
import { setDevSession } from '@/features/auth/hooks/useSession';
import { logOutPurchaseUser } from '@/features/billing/purchases';
import { resetAnalytics } from '@/shared/lib/analytics';

/**
 * Tears down every piece of per-user state and returns to the sign-in screen.
 *
 * Two callers: the Log Out sheet (deliberate), and the global 401 handler
 * (forced — token revoked, expired beyond refresh, or the account was deleted
 * on another device). Both need the exact same teardown, and missing one of
 * these steps leaks the previous user into the next session — RevenueCat keeps
 * the old entitlement, PostHog keeps attributing events, and the query cache
 * hands the new user the old user's Moments.
 */
let inFlight: Promise<void> | null = null;

export function forceSignOut(): Promise<void> {
  // A revoked token fails every in-flight query at once; without this guard we
  // would run the teardown (and the redirect) once per failed query.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const sb = getSupabaseClient();
      if (sb) await sb.auth.signOut();
      await logOutPurchaseUser();
      setDevSession(null);
      resetAnalytics();
      queryClient.clear();
      resetUnauthorizedGuard();
    } finally {
      router.replace('/onboarding/auth');
      // Let a later sign-out run again, but only after this one has landed.
      inFlight = null;
    }
  })();

  return inFlight;
}
