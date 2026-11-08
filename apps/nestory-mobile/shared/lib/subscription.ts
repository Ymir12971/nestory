const OPEN_ENDED_YEARS = 50;

/**
 * R-05 Ended (SubscriptionRules v1.3): a lapsed subscriber can still switch
 * between every profile — the backend only refuses never_paid. One sentence
 * for the Home switcher and the Settings profile notices, so they can't drift.
 */
export const PREMIUM_ENDED_PROFILES_NOTE =
  'Premium ended. All your profiles are still here — renew to keep switching freely.';

/**
 * What Premium buys — one list for the paywall, the onboarding plan picker, the
 * subscription page, the welcome screen and the cancelled screen, so a benefit
 * can't be sold in one place and missing in another. List only what has
 * shipped: the stores read this as what the subscription delivers. The
 * design's "Annual Recap and more features" is left out until Annual Recap
 * exists, and GET /subscriptions/me's `benefits` isn't used — it still names
 * Highlights and Birthday Celebrations.
 */
export const PREMIUM_BENEFITS = [
  'Unlimited child profiles',
  'Unlimited monthly Stories',
  'Watermark-Free Sharing',
  'Access to regenerate past Stories',
] as const;

/**
 * True when an expiry is too far off to be a billing date. A Premium that was
 * granted rather than bought never renews — RevenueCat stamps a lifetime
 * promotional with an expiry 200 years out — so "Renews Aug 11, 2226" is noise.
 */
export function isOpenEndedExpiry(iso: string | null): boolean {
  if (!iso) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() + OPEN_ENDED_YEARS);
  return new Date(iso).getTime() > cutoff.getTime();
}
