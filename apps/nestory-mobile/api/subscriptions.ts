import { useQuery } from '@tanstack/react-query';
import type { Subscription } from '@nestory/types';
import { apiFetch } from './client';
import { queryClient, queryKeys } from './queryClient';

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
/**
 * Send the store's reason for a refused purchase or restore to the server,
 * which keeps it in audit_log. The user only ever sees the friendly line, so
 * this is the record of what actually went wrong. Fire-and-forget: a report
 * that doesn't arrive (offline, say) must never turn into a second error.
 */
export function reportPurchaseFailure(report: {
  action:   'purchase' | 'restore';
  failure:  string;
  reason:   string;
  platform: 'ios' | 'android';
}): void {
  apiFetch<void>('/subscriptions/purchase-failed', { method: 'POST', body: report }).catch(() => {});
}

export async function refreshMySubscription(): Promise<{ applied: boolean }> {
  const res = await apiFetch<{ data: { applied: boolean } }>('/subscriptions/refresh', {
    method: 'POST',
  });
  return res.data;
}

const PURCHASE_FOLLOW_UP_MS = [5_000, 15_000, 30_000];

/**
 * Bring the app's plan up to date once the store has confirmed a purchase.
 *
 * Our row is written by RevenueCat's webhook, which lands a few seconds after
 * the store sheet closes. Re-reading /subscriptions/me straight away still
 * answered Free, and screens that stay mounted — Home's profile switcher —
 * went on offering "Upgrade to Premium" until something else refetched. So ask
 * the server to pull the purchase from RevenueCat first; if that call fails,
 * look again a few times while the webhook arrives.
 */
export async function syncSubscriptionAfterPurchase(): Promise<void> {
  const reread = () => queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
  try {
    await refreshMySubscription();
  } catch {
    PURCHASE_FOLLOW_UP_MS.forEach((ms) => setTimeout(() => void reread(), ms));
  }
  await reread();
}
