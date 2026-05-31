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
import { parseParams, parseQuery, uuidParam } from '../lib/validation';
import { currentMonthKey } from '../lib/month';

/**
 * 决策 4：没有 POST /stories（公网）。
 * 生成走 BullMQ worker / cron / milestone hook。
 * 公网仅暴露读接口 + status 轮询。
 */

const listQuery = z.object({
  childId: z.string().uuid(),
  year:    z.coerce.number().int().min(2020).max(2100).optional(),
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
    if (status === 'generating' || status === 'pending') return 'current_in_progress';
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

    // memoryCount per month — bucket once instead of N queries. UTC drift
    // matches the existing month_key compromise; precise tz bucketing waits
    // for the generated month_key column.
    const allMemoryDates = await prisma.rawAsset.findMany({
      where:  { ...whereNotDeleted, childId: q.childId },
      select: { capturedAt: true },
    });
    const memoryCountByMonth = new Map<string, number>();
    for (const r of allMemoryDates) {
      const d = r.capturedAt;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      memoryCountByMonth.set(key, (memoryCountByMonth.get(key) ?? 0) + 1);
    }

    // 当月数据
    const curStory = stories.find(s => s.monthKey === curMonthKey);
    const memCount = memoryCountByMonth.get(curMonthKey) ?? 0;

    const currentMonth: CurrentMonthStatus = {
      monthKey: curMonthKey,
      listItemState: isFreeQuotaOut
        ? 'current_quota_exhausted'
        : (curStory?.status === 'generating' || curStory?.status === 'pending' || curStory?.status === 'queued')
          ? 'current_in_progress'
          : 'current_collecting',
      memoryCount:         memCount,
      daysUntilGeneration: daysUntilNextMonth(),
      milestoneLevel:      memCount >= 15 ? '15+' : memCount >= 10 ? '10' : memCount >= 3 ? '3' : memCount >= 1 ? '1' : null,
    };

    // 历史月份（最多回溯到 child 出生所在月）
    const historicalKeys = buildMonthSeries(curMonthKey, q.year ? 12 : 24).slice(1); // 去掉当月
    const historical: StoryListItem[] = historicalKeys.map(monthKey => {
      const s = stories.find(st => st.monthKey === monthKey);
      if (!s) {
        return {
          id:               null,
          monthKey,
          status:           null,
          listItemState:    'historical_not_generated',
          coverImageUrl:    null,
          title:            null,
          isLastFreeStory:  false,
          watermarkEnabled: null,
          generatedAt:      null,
          memoryCount:      null,
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
        memoryCount:      memoryCountByMonth.get(monthKey) ?? 0,
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
