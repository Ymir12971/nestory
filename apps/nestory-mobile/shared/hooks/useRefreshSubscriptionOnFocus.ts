import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { queryClient, queryKeys } from '@/api';

const FOLLOW_UP_MS = [5_000, 15_000, 30_000];

/**
 * Re-reads the subscription whenever the screen comes into view, and again
 * when the app returns to the foreground while it is showing.
 *
 * A subscription changes behind the app's back: it renews, lapses, or is
 * cancelled in the store's own screens. The query is otherwise fetched once and
 * tab screens stay mounted, so Settings went on saying "Premium · Renews" after
 * the plan had ended until the app was restarted.
 */
export function useRefreshSubscriptionOnFocus(): void {
  useFocusEffect(
    useCallback(() => {
      const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
      refresh();

      let later: ReturnType<typeof setTimeout>[] = [];
      const clearLater = () => {
        later.forEach(clearTimeout);
        later = [];
      };
      const sub = AppState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        refresh();
        // Coming back from the store's subscription page: its change reaches
        // us through a webhook that lands well after the user does — a cancel
        // took 10-30s to show up — so look again a few times.
        clearLater();
        later = FOLLOW_UP_MS.map((ms) => setTimeout(refresh, ms));
      });
      return () => {
        sub.remove();
        clearLater();
      };
    }, []),
  );
}
