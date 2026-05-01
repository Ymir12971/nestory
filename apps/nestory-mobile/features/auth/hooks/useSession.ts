import { useEffect, useState } from 'react';

// Stub: replace with Supabase auth when wired up (Day 4+).
// Until then, SignInScreen calls setDevSession() to fake a logged-in state
// so demos can walk Welcome → SignIn → Home without a real OAuth flow.
export type Session = { userId: string };

let _devSession: Session | null = null;
const _listeners = new Set<() => void>();

export function setDevSession(next: Session | null) {
  _devSession = next;
  _listeners.forEach(fn => fn());
}

export function useSession(): { session: Session | null; isLoading: boolean } {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force(n => n + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  return { session: _devSession, isLoading: false };
}
