import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';

const DEFAULT_FALLBACK: Href = '/(tabs)' as Href;

/**
 * Stable "go back" handler that survives a hard refresh on web.
 *
 * On native, expo-router's `router.back()` always works because the navigation
 * stack lives in JS. On web, a hard refresh wipes the SPA stack — `router.back()`
 * then falls through to `window.history.back()`, which is a no-op when the user
 * landed on the page directly. This hook checks `router.canGoBack()` first and
 * replaces to the given fallback when there's nothing to pop.
 */
export function useGoBack(fallback: Href = DEFAULT_FALLBACK): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
