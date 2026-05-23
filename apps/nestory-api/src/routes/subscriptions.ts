import type { FastifyInstance } from 'fastify';
import type {
  Subscription,
  SubscriptionStatus,
  SubscriptionContractStatus,
  PlanType,
  BillingCycle,
} from '@nestory/types';
import { prisma, whereNotDeleted } from '../lib/prisma';
import { ApiError, Errors } from '../lib/errors';
import {
  deriveSubscriptionUpdate,
  verifyWebhookAuth,
  type RCWebhookPayload,
} from '../lib/revenueCat';

const HIGHLIGHT_LIMIT_FREE = 10;

/**
 * Free 用户的 Premium 权益描述（ST-02B 展示用）
 * Premium 用户的 benefits 由 paywall-config 给出
 */
const FREE_BENEFITS: string[] = [
  'Up to 10 Highlights',
  '2 Stories per month (rolling quota)',
  'Watermarked sharing',
];

const PREMIUM_BENEFITS: string[] = [
  'Unlimited Highlights',
  'Unlimited monthly Stories',
  'Watermark-free sharing',
  'Birthday Celebrations & extra features',
];

export async function subscriptionsRoutes(app: FastifyInstance) {
  // GET /subscriptions/me — 当前订阅状态聚合
  app.get('/me', async (req): Promise<{ data: Subscription }> => {
    const [sub, user, hlCount] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId: req.userId } }),
      prisma.user.findFirst({
        where:  { ...whereNotDeleted, id: req.userId },
        select: { activeChildId: true },
      }),
      prisma.highlight.count({
        where: { ...whereNotDeleted, userId: req.userId },
      }),
    ]);

    if (!sub)  throw Errors.notFound('Subscription');
    if (!user) throw Errors.notFound('User', req.userId);

    const isPremium = sub.subscriptionStatus === 'premium_active' ||
                      sub.subscriptionStatus === 'trial_active';

    const data: Subscription = {
      planType:           sub.planType as PlanType,
      subscriptionStatus: sub.subscriptionStatus as SubscriptionStatus,
      status:             sub.status as SubscriptionContractStatus,
      billingCycle:       sub.billingCycle as BillingCycle | null,
      storyQuotaRemaining: isPremium ? null : sub.storyQuota,
      expiresAt:          sub.expiresAt?.toISOString() ?? null,
      benefits:           isPremium ? PREMIUM_BENEFITS : FREE_BENEFITS,
      highlightCount:     hlCount,
      highlightLimit:     isPremium ? null : HIGHLIGHT_LIMIT_FREE,
      activeChildId:      user.activeChildId,
    };
    return { data };
  });

  // POST /subscriptions/sync — RevenueCat webhook.
  //
  // Exempt from JWT auth (see lib/auth.ts) — instead we verify a shared secret
  // in the Authorization header (configured in RC Dashboard → Integrations →
  // Webhooks → Authorization header value, mirrored to REVENUECAT_WEBHOOK_SECRET).
  //
  // Idempotency / ordering:
  //   - `lastEventId` blocks exact duplicates (RC retries on non-2xx)
  //   - `lastEventAt` blocks events older than the last applied one, so
  //     out-of-order delivery can't regress a more recent state.
  //
  // Always reply 2xx after auth passes; non-2xx triggers RC retries which we
  // don't want for things like unknown event types or unknown users.
  app.post('/sync', async (req, reply) => {
    if (!verifyWebhookAuth(req)) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid webhook authorization', statusCode: 401 },
      });
    }

    const body = req.body as RCWebhookPayload | undefined;
    const event = body?.event;
    if (!event?.id || !event.type || !event.app_user_id || typeof event.event_timestamp_ms !== 'number') {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Malformed RC webhook payload', statusCode: 400 },
      });
    }

    req.log.info(
      { rcEventId: event.id, type: event.type, userId: event.app_user_id, env: event.environment },
      'RC webhook received',
    );

    const sub = await prisma.subscription.findUnique({ where: { userId: event.app_user_id } });
    if (!sub) {
      // RC has the user but we don't — they haven't logged into our app yet,
      // or app_user_id wasn't aliased to the Supabase user UUID. Ack & move on.
      req.log.warn({ userId: event.app_user_id, rcEventId: event.id }, 'RC event for unknown user');
      return { received: true, applied: false, reason: 'unknown_user' };
    }

    if (sub.lastEventId === event.id) {
      return { received: true, applied: false, reason: 'duplicate' };
    }
    if (sub.lastEventAt && event.event_timestamp_ms < sub.lastEventAt.getTime()) {
      return { received: true, applied: false, reason: 'stale' };
    }

    const update = deriveSubscriptionUpdate(event, sub);
    const eventTs = new Date(event.event_timestamp_ms);

    if (!update) {
      // Informational event (TEST, TRANSFER, …) — record the id/ts but no state change.
      await prisma.subscription.update({
        where: { userId: event.app_user_id },
        data:  { lastEventId: event.id, lastEventAt: eventTs },
      });
      return { received: true, applied: false, reason: 'informational', type: event.type };
    }

    await prisma.subscription.update({
      where: { userId: event.app_user_id },
      data:  { ...update, lastEventId: event.id, lastEventAt: eventTs },
    });
    return { received: true, applied: true, type: event.type };
  });

  // GET /subscriptions/paywall-config — A/B/C/D 配置（前端 PaywallModal 已硬编码 headlines/benefits，
  // 此 endpoint 用于动态调价 / A/B 测试）
  app.get('/paywall-config', async () => {
    throw new ApiError('INTERNAL_ERROR', 'TODO: paywall-config (low priority — mobile has fallback)', 501);
  });
}
