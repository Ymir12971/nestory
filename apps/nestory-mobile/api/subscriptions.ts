import { useQuery } from '@tanstack/react-query';
import type { Subscription } from '@nestory/types';
import { apiFetch } from './client';
import { queryKeys } from './queryClient';

export async function getMySubscription(): Promise<Subscription> {
  const res = await apiFetch<{ data: Subscription }>('/subscriptions/me');
  return res.data;
}

export function useSubscription() {
  return useQuery({ queryKey: queryKeys.subscription, queryFn: getMySubscription });
}

/**
 * Ask the server to re-read this user's entitlements from RevenueCat.
 *
 * Called after "Restore Purchases": restoring only re-attaches the purchase
 * inside RC, and the webhook doesn't reliably follow, so without this the app
 * would still read Free from our own API. `applied` is whether the row moved.
 */
export async function refreshMySubscription(): Promise<{ applied: boolean }> {
  const res = await apiFetch<{ data: { applied: boolean } }>('/subscriptions/refresh', {
    method: 'POST',
  });
  return res.data;
}
