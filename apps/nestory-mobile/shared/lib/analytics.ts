// Minimal analytics facade — Handoff §5 MVP events. No provider is chosen yet
// (PostHog/Amplitude/…), so events log to the console in dev and no-op in
// production until a provider lands here. Call sites stay stable either way.

export type AnalyticsEvent =
  | 'signup_success'          // { method: 'apple' | 'google' | 'dev' }
  | 'onboarding_complete'     // { profileCount?: number; plan: 'free' | 'premium' }
  | 'memory_saved'            // { photoCount: number; charCount: number; isBackfill: boolean }
  | 'story_opened'            // { storyId: string }  (isFirstOpen: derive server-side later)
  | 'story_shared'            // { channel?: string }
  | 'paywall_viewed'          // { source: string }
  | 'subscribe_success'       // { cycle: 'monthly' | 'yearly'; source: string }
  | 'subscription_cancelled'  // { reason?: string; otherText?: string }
  | 'story_regenerated';      // { monthKey: string }

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  // TODO: forward to the chosen analytics SDK once selected.
  if (__DEV__) {
    console.log(`[analytics] ${event}`, props ?? {});
  }
}
