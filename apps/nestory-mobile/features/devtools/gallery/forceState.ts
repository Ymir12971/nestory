import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Forces the shared query cache into a chosen state so a real screen renders a
 * specific Figma frame without the backend being in that state.
 *
 * The trick is `setQueryDefaults`: seeding data alone is not enough, because
 * the screen mounts, sees stale data and refetches over it. Pinning
 * staleTime/refetchOnMount per key keeps whatever we put there. For the states
 * you cannot reach by any amount of tapping — a failed load, a spinner that
 * never resolves — we install a queryFn that rejects or never settles.
 *
 * Everything here is dev-only and touches the app's real QueryClient, so
 * `clearForcedState` has to run before returning to normal use.
 */
const KEEP = {
  staleTime: Infinity,
  gcTime: Infinity,
  retry: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
} as const;

/** Keys we have overridden, so we can undo them on exit. */
const touched: QueryKey[] = [];

export function forceData<T>(qc: QueryClient, key: QueryKey, data: T): void {
  touched.push(key);
  qc.setQueryDefaults(key, { ...KEEP, queryFn: () => Promise.resolve(data) });
  qc.setQueryData(key, data);
}

/** A spinner that never resolves — the "loading" frames. */
export function forceLoading(qc: QueryClient, key: QueryKey): void {
  touched.push(key);
  qc.removeQueries({ queryKey: key, exact: true });
  qc.setQueryDefaults(key, { ...KEEP, queryFn: () => new Promise(() => {}) });
}

/** A failed load — the "couldn't load" frames, without unplugging the network. */
export function forceError(qc: QueryClient, key: QueryKey): void {
  touched.push(key);
  qc.removeQueries({ queryKey: key, exact: true });
  qc.setQueryDefaults(key, {
    ...KEEP,
    queryFn: () => Promise.reject(new Error('Gallery: forced failure state')),
  });
}

/**
 * Drops every override and empties the cache. `setQueryDefaults` has no
 * removal API, so we overwrite each key with an empty default — which restores
 * the client-level defaults — and then clear so real queries refetch.
 */
export function clearForcedState(qc: QueryClient): void {
  for (const key of touched) qc.setQueryDefaults(key, {});
  touched.length = 0;
  qc.clear();
}

export function hasForcedState(): boolean {
  return touched.length > 0;
}
