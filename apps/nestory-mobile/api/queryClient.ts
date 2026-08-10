import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './client';

/**
 * Global 401 hook. Registered by the root layout rather than imported here —
 * the sign-out routine needs this module, so importing it back would be a
 * cycle.
 *
 * Without this, a revoked or expired token (or an account deleted on another
 * device) leaves the app stuck: every screen renders its own "Failed to load"
 * with a retry that can never succeed, and the only way out is finding the
 * Log Out row on a Settings page that is itself failing to load.
 */
let onUnauthorized: ((error: ApiClientError) => void) | null = null;
/** A revoked token fails every in-flight query — react to the first only. */
let unauthorizedHandled = false;

export function setUnauthorizedHandler(fn: ((error: ApiClientError) => void) | null): void {
  onUnauthorized = fn;
}

/** Re-arms the handler once the session is usable again (restore / sign-out). */
export function resetUnauthorizedGuard(): void {
  unauthorizedHandled = false;
}

function handleIfUnauthorized(error: unknown): void {
  if (!(error instanceof ApiClientError) || error.statusCode !== 401) return;
  if (unauthorizedHandled) return;
  unauthorizedHandled = true;
  onUnauthorized?.(error);
}

export const queryClient = new QueryClient({
  queryCache:    new QueryCache({ onError: handleIfUnauthorized }),
  mutationCache: new MutationCache({ onError: handleIfUnauthorized }),
  defaultOptions: {
    queries: {
      // mobile 网络抖动多，给 1 次重试，但 4xx 不重试
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.statusCode < 500) return false;
        return failureCount < 1;
      },
      staleTime: 30 * 1000, // 30s 内复用 cache
      refetchOnWindowFocus: false, // mobile 没有 window focus 概念
    },
    mutations: {
      retry: false,
    },
  },
});

// 跨模块 invalidate 的统一 key namespace
export const queryKeys = {
  user:           ['user', 'me'] as const,
  subscription:   ['subscription', 'me'] as const,
  children:       ['children'] as const,
  child:          (id: string) => ['child', id] as const,
  assets:         (childId: string, month?: string) => ['assets', childId, month ?? null] as const,
  asset:          (id: string) => ['asset', id] as const,
  assetsTrash:    (childId?: string) => ['assets', 'trash', childId ?? null] as const,
  assetMonths:    (childId: string) => ['assets', 'months', childId] as const,
  stories:        (childId: string, year?: number) => ['stories', childId, year ?? null] as const,
  story:          (id: string) => ['story', id] as const,
  storyStatus:    (id: string) => ['story', id, 'status'] as const,
};
