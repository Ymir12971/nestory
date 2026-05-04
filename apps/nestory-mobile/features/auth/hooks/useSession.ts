import { useEffect, useState } from 'react';
import type { Session as SbSession } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseAuthAvailable } from '@/features/auth/supabaseClient';

export type Session = { userId: string; accessToken: string | null };

// ─── Dev escape hatch ──────────────────────────────────────────────────────
// When EXPO_PUBLIC_SUPABASE_* envs are absent (or for the demo flow before
// OAuth is configured), SignInScreen calls setDevSession() to set an in-memory
// session whose access token is `dev-<userId>`. The API server recognises that
// prefix in non-production and trusts the embedded userId.

let _devSession: Session | null = null;
const _listeners = new Set<() => void>();

export function setDevSession(next: { userId: string } | null): void {
  _devSession = next ? { userId: next.userId, accessToken: null } : null;
  _listeners.forEach(fn => fn());
}

function getDevSession(): Session | null {
  return _devSession;
}

// ─── React hook ────────────────────────────────────────────────────────────

export function useSession(): { session: Session | null; isLoading: boolean } {
  const [sbSession, setSbSession] = useState<SbSession | null>(null);
  const [, force]                 = useState(0);
  const [isLoading, setIsLoading] = useState(isSupabaseAuthAvailable());

  // Subscribe to dev-session changes so setDevSession() in SignInScreen still
  // re-renders consumers without involving Supabase.
  useEffect(() => {
    const fn = () => force(n => n + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  // Subscribe to Supabase auth state when the client is configured.
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSbSession(data.session);
      setIsLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSbSession(next);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Real Supabase session beats dev session when both are set.
  if (sbSession?.user) {
    return {
      session: { userId: sbSession.user.id, accessToken: sbSession.access_token },
      isLoading,
    };
  }
  return { session: getDevSession(), isLoading };
}
