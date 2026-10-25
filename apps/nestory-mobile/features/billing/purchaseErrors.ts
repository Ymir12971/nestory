import { Platform } from 'react-native';

/**
 * Why a purchase or restore didn't go through, in terms the screens can word.
 * purchases.native.ts sorts RevenueCat's error codes into these.
 */
export type PurchaseFailure =
  | 'not_allowed'    // the store won't let this account/device pay — e.g. a work account whose admin blocks purchases
  | 'unavailable'    // the plan isn't on offer to this account right now
  | 'network'
  | 'store'          // the store itself errored
  | 'already_owned'
  | 'other_account'  // this store purchase already belongs to another Nestory account
  | 'pending'
  | 'unknown';

const STORE = Platform.OS === 'ios' ? 'the App Store' : 'Google Play';
const ACCOUNT = Platform.OS === 'ios' ? 'This Apple ID' : 'This Google account';

const COPY: Record<PurchaseFailure, string> = {
  not_allowed:   `${ACCOUNT} can't make purchases on ${STORE}. Try another account, or check its payment settings in ${STORE}.`,
  unavailable:   "This plan isn't available right now. Please try again later.",
  network:       `Can't reach ${STORE} right now. Check your connection and try again.`,
  store:         `${STORE} ran into a problem. Please try again in a moment.`,
  already_owned: 'You already have this subscription. Tap Restore Purchases on the Current Plan page to get it back.',
  other_account: 'This subscription is already linked to another Nestory account.',
  pending:       'Your payment is still pending. Premium turns on as soon as it goes through.',
  unknown:       'Something went wrong. Please try again.',
};

/**
 * A purchase or restore that failed. `message` is written for the user;
 * `reason` keeps the store's own words for the logs. Before this the screens
 * printed RevenueCat's message as-is — "The device or user is not allowed to
 * make the purchase".
 */
export class PurchaseError extends Error {
  readonly failure: PurchaseFailure;
  readonly reason: string;

  constructor(failure: PurchaseFailure, reason: string) {
    super(COPY[failure]);
    this.name = 'PurchaseError';
    this.failure = failure;
    this.reason = reason;
  }
}

/** What to show for an error from purchasePlan / restorePurchases; anything else gets `fallback`. */
export function purchaseErrorMessage(e: unknown, fallback = COPY.unknown): string {
  return e instanceof PurchaseError ? e.message : fallback;
}
