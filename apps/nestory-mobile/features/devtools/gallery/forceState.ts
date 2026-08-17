import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Forces the shared query cache into a chosen state so a real screen renders a
 * specific Figma frame without the backend being in that state.
 *
 * Seeding data alone is not enough — the screen mounts, sees stale data and
 * refetches over it — so each key is also pinned to never go stale and never
 * refetch on mount.
 *
 * Note what does NOT work here: installing a queryFn via `setQueryDefaults`.
 * A queryFn passed to `useQuery` wins over the default, so an override never
 * runs, and any refetch (a poll, a month chip, a year filter) still calls the
 * real one. That is why the network block lives in apiFetch instead — see
 * setApiReadOnly, which the gallery turns on before it navigates.
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
  qc.setQueryDefaults(key, KEEP);
  qc.setQueryData(key, data);
}

/**
 * A spinner that never resolves — the "loading" frames. With the gallery's
 * network block in place a read simply never settles, so leaving the query
 * with no data is enough.
 */
export function forceLoading(qc: QueryClient, key: QueryKey): void {
  touched.push(key);
  qc.removeQueries({ queryKey: key, exact: true });
  qc.setQueryDefaults(key, KEEP);
}

/**
 * A failed load — the "couldn't load" frames, without unplugging the network.
 *
 * Written straight into the cache entry: there is no public API for seeding an
 * error the way setQueryData seeds data, and the queryFn route does not work
 * (see the note above). `build` returns the existing entry or creates one, so
 * the screen finds a query already in its error state on mount.
 */
export function forceError(qc: QueryClient, key: QueryKey): void {
  touched.push(key);
  qc.removeQueries({ queryKey: key, exact: true });
  qc.setQueryDefaults(key, KEEP);
  const query = qc.getQueryCache().build(qc, { queryKey: key });
  query.setState({
    status: 'error',
    error: new Error('Gallery: forced failure state'),
    fetchStatus: 'idle',
    errorUpdatedAt: Date.now(),
  } as never);
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
