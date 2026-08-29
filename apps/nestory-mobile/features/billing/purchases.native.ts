// Native (iOS/Android) RevenueCat implementation. Metro picks this over
// purchases.ts on native platforms. Signatures must stay in sync with the
// web stub in purchases.ts (the TypeScript source of truth).

import { Linking, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { config } from '@/shared/config';
import type { PurchaseCycle, PurchaseResult, RestoreResult } from './purchases';

let _configured = false;

export function isPurchasesAvailable(): boolean {
  return !!config.revenueCatKey;
}

export async function initPurchases(): Promise<void> {
  if (_configured || !isPurchasesAvailable()) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: config.revenueCatKey });
  _configured = true;
}

/**
 * Alias the RevenueCat customer to our Supabase user id. This is what makes the
 * webhook's `app_user_id` match `subscriptions.userId` on the backend — without
 * it RC events carry an anonymous RC id that maps to no user.
 */
export async function identifyPurchaseUser(userId: string): Promise<void> {
  if (!isPurchasesAvailable()) return;
  await initPurchases();
  try {
    await Purchases.logIn(userId);
  } catch {
    // Best-effort: a failed identify shouldn't block app usage.
  }
}

export async function logOutPurchaseUser(): Promise<void> {
  if (!isPurchasesAvailable() || !_configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // RC throws if the user is already anonymous — safe to ignore.
  }
}

export async function purchasePlan(cycle: PurchaseCycle): Promise<PurchaseResult> {
  if (!isPurchasesAvailable()) {
    throw new Error('In-app purchases are not available on this platform.');
  }
  await initPurchases();

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) throw new Error('No subscription offerings are configured yet.');

  const pkg: PurchasesPackage | null =
    cycle === 'yearly' ? current.annual : current.monthly;
  if (!pkg) throw new Error(`The ${cycle} plan isn't available right now.`);

  try {
    await Purchases.purchasePackage(pkg);
    return { status: 'purchased' };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && (e as { userCancelled?: boolean }).userCancelled) {
      return { status: 'cancelled' };
    }
    throw e;
  }
}

/**
 * Re-attach a store purchase made by this Apple ID / Google account to the
 * current app user. Required by App Store Review Guideline 3.1.1 — a
 * reinstalling subscriber has no other way back to Premium.
 *
 * Restoring only moves the entitlement inside RevenueCat; our own
 * `subscriptions` row is written by the webhook, and a transfer does not
 * always produce one we act on. The caller is expected to follow a
 * `restored` result with POST /subscriptions/refresh, which re-reads the
 * authoritative state from RC server-side.
 */
export async function restorePurchases(): Promise<RestoreResult> {
  if (!isPurchasesAvailable()) {
    throw new Error('In-app purchases are not available on this platform.');
  }
  await initPurchases();

  const info: CustomerInfo = await Purchases.restorePurchases();
  const hasActive = Object.keys(info.entitlements.active).length > 0;
  return { status: hasActive ? 'restored' : 'nothing_to_restore' };
}

/**
 * Deep-link to the store's subscription management screen — neither platform
 * permits cancelling from inside the app. RC's helper opens the native iOS
 * sheet and the Play subscriptions page respectively; the Linking fallback
 * covers the case where it is unavailable (older store app, unmanaged
 * subscription).
 */
export async function openManageSubscriptions(): Promise<void> {
  try {
    await Purchases.showManageSubscriptions();
  } catch {
    await Linking.openURL(
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions',
    );
  }
}
