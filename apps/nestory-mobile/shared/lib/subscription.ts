const OPEN_ENDED_YEARS = 50;

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
