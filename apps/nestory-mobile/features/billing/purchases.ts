// Web / default implementation of the in-app-purchase surface.
//
// RevenueCat's `react-native-purchases` is native-only. Metro resolves
// `purchases.native.ts` on iOS/Android and this file everywhere else (web, and
// as the TypeScript source of truth for the module's shape). Keeping this file
// free of any `react-native-purchases` import is what lets the web bundle build
// — important because we actively develop on web.

export type PurchaseCycle = 'yearly' | 'monthly';
export type PurchaseResult = { status: 'purchased' | 'cancelled' };

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

export async function purchasePlan(_cycle: PurchaseCycle): Promise<PurchaseResult> {
  throw new Error('In-app purchases are not available on this platform.');
}

export async function openManageSubscriptions(): Promise<void> {
  // no-op on web
}
