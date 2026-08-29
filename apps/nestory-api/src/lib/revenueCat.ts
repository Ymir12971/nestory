import { timingSafeEqual } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { FastifyRequest } from 'fastify';

/**
 * RevenueCat webhook payload — we model only the fields we use.
 * Reference: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */
export interface RCWebhookPayload {
  api_version: string;
  event:       RCEvent;
}

export interface RCEvent {
  id:                  string;
  type:                string;       // INITIAL_PURCHASE | RENEWAL | EXPIRATION | ...
  event_timestamp_ms:  number;
  app_user_id:         string;       // we set this to the Supabase user UUID via Purchases.logIn
  product_id?:         string;       // e.g. "nestory_premium_yearly"
  period_type?:        'NORMAL' | 'TRIAL' | 'INTRO' | 'PROMOTIONAL';
  expiration_at_ms?:   number;
  environment?:        'SANDBOX' | 'PRODUCTION';
  store?:              string;       // "PLAY_STORE" | "APP_STORE" | ...
}

/**
 * Verify the RC dashboard's configured Authorization header against the
 * REVENUECAT_WEBHOOK_SECRET env. Accepts both "Bearer <secret>" and bare
 * "<secret>" since RC lets you set the header value freely.
 *
 * If the env is unset we refuse rather than silently accepting — easier to
 * notice misconfiguration than to find spoofed events in the audit log.
 */
export function verifyWebhookAuth(req: FastifyRequest): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expected) {
    req.log.warn('REVENUECAT_WEBHOOK_SECRET unset — rejecting webhook');
    return false;
  }
  const header = req.headers.authorization;
  if (!header) return false;
  const candidate = header.startsWith('Bearer ') ? header.slice(7) : header;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Five-state transition: derive a partial Subscription update from an RC
 * event, given the row's current `subscriptionStatus` (needed to disambiguate
 * EXPIRATION → trial_ended vs premium_ended).
 *
 * Returns null for informational events (TEST, TRANSFER, …) that should be
 * acknowledged without touching state.
 *
 * Mapping rationale:
 *   - INITIAL_PURCHASE/RENEWAL/UNCANCELLATION/PRODUCT_CHANGE → grant premium;
 *     trial period_type maps to trial_active, otherwise premium_active.
 *   - CANCELLATION → user clicked cancel but rights remain until expiry; only
 *     flip the contract `status` to 'cancelled'.
 *   - EXPIRATION → drop to free; remember whether they came from trial or paid.
 *   - BILLING_ISSUE → treat like CANCELLATION for now (RC will follow up with
 *     EXPIRATION after grace period); revisit if we add a grace-period UI.
 */
export function deriveSubscriptionUpdate(
  event: RCEvent,
  current: { subscriptionStatus: string },
): Prisma.SubscriptionUpdateInput | null {
  const isTrial   = event.period_type === 'TRIAL' || event.period_type === 'INTRO';
  const cycle     = inferBillingCycle(event.product_id);
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : undefined;

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      return {
        subscriptionStatus: isTrial ? 'trial_active' : 'premium_active',
        planType:           'premium',
        status:             'active',
        ...(cycle ? { billingCycle: cycle } : {}),
        ...(expiresAt ? { expiresAt } : {}),
      };

    case 'CANCELLATION':
    case 'BILLING_ISSUE':
      return { status: 'cancelled' };

    case 'EXPIRATION': {
      const ended =
        current.subscriptionStatus === 'trial_active'   ? 'trial_ended'   :
        current.subscriptionStatus === 'premium_active' ? 'premium_ended' :
        current.subscriptionStatus; // already in an ended state — leave alone
      return {
        subscriptionStatus: ended,
        planType:           'free',
        status:             'expired',
        billingCycle:       null,
        ...(expiresAt ? { expiresAt } : {}),
      };
    }

    case 'TEST':
    case 'TRANSFER':
    case 'SUBSCRIBER_ALIAS':
    case 'NON_RENEWING_PURCHASE':
    case 'SUBSCRIPTION_PAUSED':
    case 'SUBSCRIPTION_EXTENDED':
      return null;

    default:
      return null;
  }
}

function inferBillingCycle(productId?: string): 'yearly' | 'monthly' | null {
  if (!productId) return null;
  if (productId.includes('yearly') || productId.includes('annual')) return 'yearly';
  if (productId.includes('monthly')) return 'monthly';
  return null;
}

// ── Authoritative pull (POST /subscriptions/refresh) ───────────────────────
//
// Webhooks are the primary path, but they are not sufficient on their own:
// a restore on a reinstalled device transfers the entitlement inside RC and
// may only emit events `deriveSubscriptionUpdate` deliberately ignores, and a
// webhook dropped while REVENUECAT_WEBHOOK_SECRET was misconfigured is never
// replayed. Reading the subscriber back from RC covers both.

const RC_API_BASE = 'https://api.revenuecat.com/v1';

/** Subset of the REST subscriber object we read. */
export interface RCSubscriber {
  entitlements?: Record<string, {
    expires_date?:       string | null;
    product_identifier?: string;
  }>;
  subscriptions?: Record<string, {
    expires_date?:              string | null;
    period_type?:               string;   // "normal" | "trial" | "intro"
    unsubscribe_detected_at?:   string | null;
    billing_issues_detected_at?: string | null;
  }>;
}

/**
 * GET /v1/subscribers/{app_user_id}. Returns null when RC is not configured,
 * so callers can surface "unavailable" rather than "not subscribed" — the two
 * must not collapse into the same answer.
 */
export async function fetchRCSubscriber(appUserId: string): Promise<RCSubscriber | null> {
  const key = process.env.REVENUECAT_API_KEY;
  if (!key) return null;

  const res = await fetch(`${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    signal:  AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`RevenueCat returned ${res.status} for subscriber ${appUserId}`);
  }
  const body = (await res.json()) as { subscriber?: RCSubscriber };
  return body.subscriber ?? {};
}

/**
 * Same five-state mapping as `deriveSubscriptionUpdate`, driven by a full
 * subscriber snapshot instead of a single event. Returns null when the
 * snapshot already agrees with the row, so a refresh that changes nothing
 * doesn't churn `updatedAt`.
 */
export function deriveSubscriptionFromSubscriber(
  subscriber: RCSubscriber,
  current: { subscriptionStatus: string; planType: string },
  now = new Date(),
): Prisma.SubscriptionUpdateInput | null {
  const entitlements = subscriber.entitlements ?? {};
  const active = Object.values(entitlements).find(
    (e) => !e.expires_date || new Date(e.expires_date) > now,
  );

  if (active) {
    const productId = active.product_identifier;
    const detail    = productId ? subscriber.subscriptions?.[productId] : undefined;
    const isTrial   = detail?.period_type === 'trial' || detail?.period_type === 'intro';
    const cycle     = inferBillingCycle(productId);
    // Cancelled-but-still-entitled: rights run to the end of the paid period,
    // which is exactly what the CANCELLATION event branch encodes.
    const cancelled = !!(detail?.unsubscribe_detected_at || detail?.billing_issues_detected_at);

    return {
      subscriptionStatus: isTrial ? 'trial_active' : 'premium_active',
      planType:           'premium',
      status:             cancelled ? 'cancelled' : 'active',
      ...(cycle ? { billingCycle: cycle } : {}),
      ...(active.expires_date ? { expiresAt: new Date(active.expires_date) } : {}),
    };
  }

  // No active entitlement. Only write if we currently believe they're premium —
  // otherwise a free user's refresh would rewrite never_paid on every call.
  if (current.planType !== 'premium') return null;

  const ended =
    current.subscriptionStatus === 'trial_active'   ? 'trial_ended'   :
    current.subscriptionStatus === 'premium_active' ? 'premium_ended' :
    current.subscriptionStatus;

  return {
    subscriptionStatus: ended,
    planType:           'free',
    status:             'expired',
    billingCycle:       null,
  };
}
