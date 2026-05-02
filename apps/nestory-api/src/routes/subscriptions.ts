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

  // POST /subscriptions/sync — RevenueCat webhook (no JWT, signature verify)
  // TODO: 接 RevenueCat webhook 验签 + last_event_at 乱序保护 + last_event_id 幂等
  app.post('/sync', async () => {
    throw new ApiError('INTERNAL_ERROR', 'TODO: RevenueCat webhook handler', 501);
  });

  // GET /subscriptions/paywall-config — A/B/C/D 配置（前端 PaywallModal 已硬编码 headlines/benefits，
  // 此 endpoint 用于动态调价 / A/B 测试）
  app.get('/paywall-config', async () => {
    throw new ApiError('INTERNAL_ERROR', 'TODO: paywall-config (low priority — mobile has fallback)', 501);
  });
}
