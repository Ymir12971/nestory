import { useEffect, useState } from 'react';
import { fetchPlanPrices, type PlanPrices } from './purchases';

/**
 * Shown wherever a price belongs but the store hasn't given us one — on web, in
 * a build without a RevenueCat key, or before the offering has loaded. A dash
 * is deliberate: a stale hard-coded number that disagrees with what the store
 * charges is worse than no number at all.
 */
export const PRICE_PLACEHOLDER = '—';

export interface PlanPricing {
  /** Formatted yearly price, or PRICE_PLACEHOLDER. */
  yearly:  string;
  /** Formatted monthly price, or PRICE_PLACEHOLDER. */
  monthly: string;
  /** Whole-percent saving of paying yearly vs. twelve monthly charges; null unless both prices are known. */
  savingsPercent: number | null;
  isLoading: boolean;
}

const UNKNOWN: PlanPrices = { yearly: null, monthly: null };

/**
 * Plan prices for the paywall surfaces. Every screen calls this rather than
 * printing a literal; RevenueCat's SDK caches offerings, so the repeat calls
 * cost nothing.
 */
export function usePlanPricing(): PlanPricing {
  const [prices, setPrices]       = useState<PlanPrices>(UNKNOWN);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPlanPrices()
      .then((next) => { if (!cancelled) setPrices(next); })
      .catch(() => { if (!cancelled) setPrices(UNKNOWN); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const { yearly, monthly } = prices;
  const savingsPercent =
    yearly && monthly && monthly.price > 0
      ? Math.round((1 - yearly.price / (monthly.price * 12)) * 100)
      : null;

  return {
    yearly:  yearly?.priceString  ?? PRICE_PLACEHOLDER,
    monthly: monthly?.priceString ?? PRICE_PLACEHOLDER,
    // A yearly plan priced at or above twelve months isn't a saving worth a badge.
    savingsPercent: savingsPercent != null && savingsPercent > 0 ? savingsPercent : null,
    isLoading,
  };
}
