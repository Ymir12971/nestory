// Analytics — Handoff §5 MVP events, backed by PostHog.
//
// Provider isolation: every call site uses track()/identify(); PostHog only
// exists in this file. Without EXPO_PUBLIC_POSTHOG_KEY the module degrades to
// the pre-SDK behavior (console in dev, no-op in prod) — safe before the
// account exists and in local dev.

import PostHog from 'posthog-react-native';

export type AnalyticsEvent =
  | 'signup_success'          // { method: 'apple' | 'google' | 'dev' }
  | 'onboarding_complete'     // { profileCount?: number; plan: 'free' | 'premium' }
  | 'moment_saved'            // { photoCount: number; charCount: number; isBackfill: boolean }
  | 'story_opened'            // { storyId: string; monthKey?: string }
  | 'story_shared'            // { channel?: string }
  | 'paywall_viewed'          // { source: string }
  | 'subscribe_success'       // { cycle: 'monthly' | 'yearly'; source: string }
  | 'subscription_cancelled'  // { reason?: string; otherText?: string }
  | 'subscription_restored'   // {} — Guideline 3.1.1 restore that actually found a purchase
  | 'story_regenerated';      // { monthKey: string }

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';

let _client: PostHog | null = null;
function getClient(): PostHog | null {
  if (!KEY) return null;
  if (_client) return _client;
  _client = new PostHog(KEY, {
    host: 'https://us.i.posthog.com',
    // Batch to cut network chatter; events flush every 10s or 20 events.
    flushAt: 20,
    flushInterval: 10_000,
  });
  return _client;
}

/** All our events carry JSON scalars only — matches PostHog's property type. */
type AnalyticsProps = Record<string, string | number | boolean | null>;

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (__DEV__) console.log(`[analytics] ${event}`, props ?? {});
  getClient()?.capture(event, props as AnalyticsProps | undefined);
}

/**
 * Tie events to a stable user id (call on sign-in success). Without this,
 * retention/north-star queries can't follow a user across sessions/devices.
 */
export function identify(userId: string, props?: Record<string, unknown>): void {
  if (__DEV__) console.log(`[analytics] identify ${userId}`);
  getClient()?.identify(userId, props as AnalyticsProps | undefined);
}

/** Detach the user on logout so the next session doesn't inherit the identity. */
export function resetAnalytics(): void {
  getClient()?.reset();
}
