// Native (iOS/Android) RevenueCat implementation. Metro picks this over
// purchases.ts on native platforms. Signatures must stay in sync with the
// web stub in purchases.ts (the TypeScript source of truth).

import { Linking } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';
import { config } from '@/shared/config';
import type { PurchaseCycle, PurchaseResult } from './purchases';

let _configured = false;

export function isPurchasesAvailable(): boolean {
  return !!config.revenueCatAndroidKey;
}

export async function initPurchases(): Promise<void> {
  if (_configured || !isPurchasesAvailable()) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: config.revenueCatAndroidKey });
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

export async function openManageSubscriptions(): Promise<void> {
  // Android subscriptions are managed in the Play Store — RC can't cancel for us.
  await Linking.openURL('https://play.google.com/store/account/subscriptions');
}
