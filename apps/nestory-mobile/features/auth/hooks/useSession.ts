// Stub: replace with Supabase auth when wired up (Day 4+).
// Returns null session so root layout redirects to /onboarding/welcome.
export type Session = { userId: string };

export function useSession(): { session: Session | null; isLoading: boolean } {
  return { session: null, isLoading: false };
}
