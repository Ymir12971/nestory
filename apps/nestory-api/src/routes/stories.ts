import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  StoryListItem,
  StoryListItemState,
  StoryStatus,
  CurrentMonthStatus,
  StoryDetail,
  StoryStatusPoll,
  StoryDocument,
  GenerationMeta,
} from '@nestory/types';
import { prisma, whereNotDeleted } from '../lib/prisma';
import { ApiError, Errors } from '../lib/errors';
import { parseBody, parseParams, parseQuery, uuidParam } from '../lib/validation';
import { currentMonthKey } from '../lib/month';
import { enqueueStoryGeneration, getStoryQueue } from '../lib/storyQueue';

/**
 * 决策 4：没有 POST /stories（公网）。
 * 生成走 BullMQ worker / cron / milestone hook。
 * 公网仅暴露读接口 + status 轮询。
 */

const listQuery = z.object({
  childId: z.string().uuid(),
  year:    z.coerce.number().int().min(2020).max(2100).optional(),
});

const generateNowSchema = z.object({
  childId:  z.string().uuid(),
  // Defaults to the user's current local month when omitted.
  monthKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

// ---------- Helpers ----------

function deriveListState(
  status: StoryStatus,
  isCurrentMonth: boolean,
  isLastFreeStory: boolean,
  isFreePlanQuotaExhausted: boolean,
): StoryListItemState {
  if (isCurrentMonth) {
    if (isFreePlanQuotaExhausted) return 'current_quota_exhausted';
    if (status === 'generating' || status === 'pending' || status === 'pending_review') return 'current_in_progress';
    return 'current_collecting';
  }
  return 'historical_generated';
}

async function getActiveSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where:  { userId },
    select: { subscriptionStatus: true, storyQuota: true },
  });
  return sub;
}

/**
 * 拼出过去 N 月的 monthKey 序列（含当月）
 */
function buildMonthSeries(currentMonthKeyStr: string, count: number): string[] {
  const [yStr, mStr] = currentMonthKeyStr.split('-');
  let y = Number(yStr);
  let m = Number(mStr);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}

// ---------- Routes ----------

export async function storiesRoutes(app: FastifyInstance) {
  // GET /stories — 当月 + 历史月份合并视图
  app.get('/', async (req): Promise<{
    data: { currentMonth: CurrentMonthStatus; historical: StoryListItem[] };
  }> => {
    const q = parseQuery(listQuery, req);

    // 校验 child 归属
    const [child, user, sub] = await Promise.all([
      prisma.child.findFirst({
        where:  { ...whereNotDeleted, id: q.childId, userId: req.userId },
        select: { id: true, birthDate: true },
      }),
      prisma.user.findFirst({
        where:  { ...whereNotDeleted, id: req.userId },
        select: { timezone: true },
      }),
      getActiveSubscription(req.userId),
    ]);
    if (!child) throw Errors.notFound('Child', q.childId);
    if (!user)  throw Errors.notFound('User', req.userId);

    const tz             = user.timezone;
    const curMonthKey    = currentMonthKey(tz);
    const isFreeQuotaOut = sub?.subscriptionStatus === 'never_paid' && (sub?.storyQuota ?? 0) <= 0;

    // 查所有 stories（按 child）
    const stories = await prisma.story.findMany({
      where:   { childId: q.childId },
      orderBy: { monthKey: 'desc' },
    });

    // momentCount per month — bucket once instead of N queries. UTC drift
    // matches the existing month_key compromise; precise tz bucketing waits
    // for the generated month_key column.
    const allMomentDates = await prisma.rawAsset.findMany({
      where:  { ...whereNotDeleted, childId: q.childId },
      select: { capturedAt: true },
    });
    const momentCountByMonth = new Map<string, number>();
    for (const r of allMomentDates) {
      const d = r.capturedAt;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      momentCountByMonth.set(key, (momentCountByMonth.get(key) ?? 0) + 1);
    }

    // 当月数据
    const curStory = stories.find(s => s.monthKey === curMonthKey);
    const memCount = momentCountByMonth.get(curMonthKey) ?? 0;

    const curStoryDoc = curStory?.document as StoryDocument | null | undefined;
    const isCurGenerated =
      curStory?.status === 'generated' || curStory?.status === 'fallback_generated';
    const isCurInProgress =
      curStory?.status === 'generating' ||
      curStory?.status === 'pending_review' ||
      curStory?.status === 'pending' ||
      curStory?.status === 'queued';

    const currentMonth: CurrentMonthStatus = {
      monthKey: curMonthKey,
      listItemState: isCurGenerated
        ? 'current_generated'
        : isFreeQuotaOut
          ? 'current_quota_exhausted'
          : isCurInProgress
            ? 'current_in_progress'
            : 'current_collecting',
      momentCount:         memCount,
      daysUntilGeneration: daysUntilNextMonth(),
      milestoneLevel:      memCount >= 15 ? '15+' : memCount >= 10 ? '10' : memCount >= 3 ? '3' : memCount >= 1 ? '1' : null,
      storyId:       isCurGenerated ? curStory!.id : null,
      title:         isCurGenerated ? (curStoryDoc?.meta.title ?? null) : null,
      coverImageUrl: isCurGenerated ? (curStoryDoc?.meta.coverImageUrl ?? null) : null,
    };

    // 历史月份（最多回溯到 child 出生所在月）
    const historicalKeys = buildMonthSeries(curMonthKey, q.year ? 12 : 24).slice(1); // 去掉当月
    const isPremiumNow =
      sub?.subscriptionStatus === 'premium_active' || sub?.subscriptionStatus === 'trial_active';

    const historical: StoryListItem[] = historicalKeys.map(monthKey => {
      const s = stories.find(st => st.monthKey === monthKey);
      const monthMoments = momentCountByMonth.get(monthKey) ?? 0;
      // 决策 3:有占位卡(= 该月有 moment)且当前是 Premium → 可生成/重生成。
      // 未成功生成的月份(E01 素材不足、配额尽、失败)也算,只要现在有素材。
      const isDone = s?.status === 'generated' || s?.status === 'fallback_generated';
      const inFlight = s?.status === 'generating' || s?.status === 'queued' ||
                       s?.status === 'pending' || s?.status === 'pending_review';
      // Handoff 3.4(b)(c):从未尝试过的月份(无行)和断订/配额空窗永不补发。
      // 只有"尝试过但因素材不足/生成出错而失败"的月份,补了 moment 后可再生成。
      const declined = (s?.generationMeta as { declined?: string } | null)?.declined;
      const failedRecoverably =
        s?.status === 'failed' && declined !== 'FREE_QUOTA_EXHAUSTED';

      // 只有真正生成完成的才是 historical_generated —— 失败/审核中的行若也标成
      // generated,客户端会渲染成可点卡片,点开必然 409。
      if (!isDone) {
        return {
          id:               null,
          monthKey,
          status:           (s?.status as StoryStatus) ?? null,
          listItemState:    'historical_not_generated',
          coverImageUrl:    null,
          title:            null,
          isLastFreeStory:  false,
          watermarkEnabled: null,
          generatedAt:      null,
          momentCount:      monthMoments,
          canRegenerate:    isPremiumNow && monthMoments > 0 && !inFlight && failedRecoverably,
        };
      }
      const doc = s.document as StoryDocument | null;
      return {
        id:               s.id,
        monthKey:         s.monthKey,
        status:           s.status as StoryStatus,
        listItemState:    'historical_generated',
        coverImageUrl:    doc?.meta.coverImageUrl ?? null,
        title:            doc?.meta.title ?? null,
        isLastFreeStory:  s.isLastFreeStory,
        watermarkEnabled: doc?.watermark.enabled ?? null,
        generatedAt:      s.generatedAt?.toISOString() ?? null,
        momentCount:      monthMoments,
        // Regenerate 蓝条信号:生成之后该月 moment 又变过(重生成刷新 generatedAt 后自动消失)
        momentsChanged:
          s.momentsChangedAt != null &&
          s.generatedAt != null &&
          s.momentsChangedAt > s.generatedAt,
        // 已生成的月份要重生成,除了 Premium 还需 moment 真的变过
        canRegenerate:
          isPremiumNow &&
          s.momentsChangedAt != null &&
          s.generatedAt != null &&
          s.momentsChangedAt > s.generatedAt,
      };
    });

    return { data: { currentMonth, historical } };
  });

  // GET /stories/:id — 完整 document
  app.get('/:id', async (req): Promise<{ data: StoryDetail }> => {
    const { id } = parseParams(uuidParam, req);

    const story = await prisma.story.findFirst({
      where: { id, userId: req.userId },
    });
    if (!story) throw Errors.notFound('Story', id);
    if (story.status !== 'generated' && story.status !== 'fallback_generated') {
      throw new ApiError('VALIDATION_ERROR', `Story is not ready (status: ${story.status})`, 409);
    }

    return {
      data: {
        id:             story.id,
        monthKey:       story.monthKey,
        status:         story.status as StoryStatus,
        document:       story.document       as unknown as StoryDocument,
        generationMeta: story.generationMeta as unknown as GenerationMeta,
      },
    };
  });

  // POST /stories/generate-now — user-triggered generation for *their* child.
  // Wraps the same BullMQ enqueue path the internal endpoint and cron use, but
  // gated on Supabase JWT ownership instead of the admin token. Idempotent: a
  // terminal (failed/completed) job is removed first so a fresh attempt runs;
  // an in-flight job is reused as-is.
  app.post('/generate-now', async (req, reply) => {
    const body = parseBody(generateNowSchema, req);

    const [child, user] = await Promise.all([
      prisma.child.findFirst({
        where:  { ...whereNotDeleted, id: body.childId, userId: req.userId },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where:  { ...whereNotDeleted, id: req.userId },
        select: { timezone: true },
      }),
    ]);
    if (!child) throw Errors.notFound('Child', body.childId);
    if (!user)  throw Errors.notFound('User', req.userId);

    const monthKey = body.monthKey ?? currentMonthKey(user.timezone);

    // Regenerate(过往月)是 Premium 专属 — 客户端已 gate,这里兜底。
    if (monthKey !== currentMonthKey(user.timezone)) {
      const sub = await prisma.subscription.findUnique({
        where:  { userId: req.userId },
        select: { subscriptionStatus: true },
      });
      const isPremium =
        sub?.subscriptionStatus === 'premium_active' ||
        sub?.subscriptionStatus === 'trial_active';
      if (!isPremium) {
        throw new ApiError(
          'REGENERATE_RESTRICTED',
          'Regenerating past-month stories requires Premium',
          403,
        );
      }
    }

    const expectedJobId = `story:${body.childId}:${monthKey}`;

    // If the deterministic job already exists, only retry/replace terminal ones;
    // active/waiting/delayed get reused so we don't double-charge the API.
    const queue = getStoryQueue();
    const existing = await queue.getJob(expectedJobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed' || state === 'completed') {
        await existing.remove();
      } else {
        reply.code(202);
        return { data: { jobId: expectedJobId, childId: body.childId, monthKey, status: 'already_in_progress' } };
      }
    }

    const jobId = await enqueueStoryGeneration({ childId: body.childId, monthKey });
    reply.code(202);
    return { data: { jobId, childId: body.childId, monthKey, status: 'enqueued' } };
  });

  // GET /stories/:id/status — 轻量轮询（推荐用 Supabase Realtime 替代）
  app.get('/:id/status', async (req): Promise<{ data: StoryStatusPoll }> => {
    const { id } = parseParams(uuidParam, req);
    const story = await prisma.story.findFirst({
      where:  { id, userId: req.userId },
      select: { id: true, status: true },
    });
    if (!story) throw Errors.notFound('Story', id);

    return {
      data: {
        id:                        story.id,
        status:                    story.status as StoryStatus,
        estimatedSecondsRemaining: story.status === 'generating' ? 60 : null,
      },
    };
  });
}

// Days remaining until the story dispatcher fires (first day of next month).
// UTC-based: small drift around month boundaries vs the user's local time, but
// it's a UI hint, not a precise SLA.
function daysUntilNextMonth(): number {
  const now = new Date();
  const firstOfNext = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.max(0, Math.ceil((firstOfNext.getTime() - now.getTime()) / 86_400_000));
}
