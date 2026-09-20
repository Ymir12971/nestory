// Web / default implementation of the in-app-purchase surface.
//
// RevenueCat's `react-native-purchases` is native-only. Metro resolves
// `purchases.native.ts` on iOS/Android and this file everywhere else (web, and
// as the TypeScript source of truth for the module's shape). Keeping this file
// free of any `react-native-purchases` import is what lets the web bundle build
// — important because we actively develop on web.

export type PurchaseCycle = 'yearly' | 'monthly';
export type PurchaseResult = { status: 'purchased' | 'cancelled' };
export type RestoreResult = { status: 'restored' | 'nothing_to_restore' };

/** One plan's price as the store reports it, already in the buyer's currency. */
export interface PlanPrice {
  /** Formatted for display, currency sign included — e.g. "US$99.99", "￥12,000". */
  priceString: string;
  /** The same amount as a number, used to work out the yearly saving. */
  price: number;
}

export type PlanPrices = Record<PurchaseCycle, PlanPrice | null>;

/** True only where RevenueCat is configured (native build + API key present). */
export function isPurchasesAvailable(): boolean {
  return false;
}

export async function initPurchases(): Promise<void> {
  // no-op on web
}

export async function identifyPurchaseUser(_userId: string): Promise<void> {
  // no-op on web
}

export async function logOutPurchaseUser(): Promise<void> {
  // no-op on web
}

export async function fetchPlanPrices(): Promise<PlanPrices> {
  return { yearly: null, monthly: null };
}

export async function purchasePlan(_cycle: PurchaseCycle): Promise<PurchaseResult> {
  throw new Error('In-app purchases are not available on this platform.');
}

export async function restorePurchases(): Promise<RestoreResult> {
  throw new Error('In-app purchases are not available on this platform.');
}

export async function openManageSubscriptions(): Promise<void> {
  // no-op on web
}
