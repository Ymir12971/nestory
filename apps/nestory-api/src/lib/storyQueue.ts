import { Queue, Worker, type Job } from 'bullmq';
import * as Sentry from '@sentry/node';
import IORedis from 'ioredis';
import { prisma, whereNotDeleted } from './prisma';
import { toMonthKey } from './month';
import { generateStory, type MomentInput } from './storyAi';
import { generateStoryV3, type V3Moment } from './storyGen';
import { getStoryGenConfig } from './storyGen/config';
import { sendPushToUser, sendStoryReadyPush } from './push';

const QUEUE_NAME      = 'story-generation';
const DISPATCHER_ID   = 'story-dispatcher-daily';
// Run once a day at 02:30 UTC. The dispatcher scans every active child whose
// previous-month-in-their-tz story is missing or failed and enqueues a generate
// job. Cron pattern is in the worker's local time — UTC for our deployment.
const DISPATCH_PATTERN = '30 2 * * *';

export type StoryJobPayload =
  | { kind: 'generate'; childId: string; monthKey: string }
  | { kind: 'dispatch' };

let _connection: IORedis | null = null;
let _queue:      Queue | null = null;
let _worker:     Worker | null = null;

function getConnection(): IORedis {
  if (_connection) return _connection;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not set');
  _connection = new IORedis(url, {
    // BullMQ requires this null to keep connections alive on long blocking calls.
    maxRetriesPerRequest: null,
  });
  // Without this listener, ioredis's connect retries emit 'error' events that
  // count as unhandled and crash the process when Redis is down (e.g. Docker
  // Desktop off in dev). Logging once is enough — repeated reconnect noise
  // would drown out real errors.
  let logged = false;
  _connection.on('error', (err) => {
    if (logged) return;
    logged = true;
    console.warn('[storyQueue] Redis unavailable:', err.message);
  });
  _connection.on('ready', () => { logged = false; });
  return _connection;
}

export function getStoryQueue(): Queue {
  if (_queue) return _queue;
  _queue = new Queue<StoryJobPayload>(QUEUE_NAME, { connection: getConnection() });
  return _queue;
}

export async function enqueueStoryGeneration(args: { childId: string; monthKey: string }): Promise<string> {
  const job = await getStoryQueue().add(
    'generate',
    { kind: 'generate', childId: args.childId, monthKey: args.monthKey },
    {
      attempts:    3,
      backoff:     { type: 'exponential', delay: 30_000 }, // 30s, 60s, 120s
      removeOnComplete: { age: 60 * 60 * 24 * 7 },         // keep 7 days
      removeOnFail:     { age: 60 * 60 * 24 * 30 },
      // Idempotency: same (childId, monthKey) collapses to one job until completion.
      jobId: `story:${args.childId}:${args.monthKey}`,
    },
  );
  return job.id ?? '';
}

/**
 * Boots the in-process worker. Concurrency = 1 — story generation is
 * latency-tolerant and we'd rather not parallel-call Anthropic from the same
 * process. Scale out by running additional API instances.
 *
 * Also upserts a daily JobScheduler that fires `dispatch` jobs at 02:30 UTC.
 * BullMQ's scheduler is Redis-backed and idempotent, so multiple API instances
 * running this at startup all converge to the same single schedule.
 */
export function startStoryWorker(log: (msg: string, data?: unknown) => void): Worker {
  if (_worker) return _worker;

  _worker = new Worker<StoryJobPayload>(
    QUEUE_NAME,
    async (job: Job<StoryJobPayload>) => {
      if (job.data.kind === 'dispatch') {
        await runDispatcher(log);
      } else {
        await processGenerateJob(job as Job<{ kind: 'generate'; childId: string; monthKey: string }>, log);
      }
    },
    {
      connection:  getConnection(),
      concurrency: 1,
      // Anthropic calls can take 30-60s; give the worker headroom.
      lockDuration: 5 * 60 * 1000,
    },
  );

  _worker.on('completed', (job) => {
    log(`[story-worker] completed ${job.id}`);
  });
  _worker.on('failed', (job, err) => {
    log(`[story-worker] failed ${job?.id}: ${err.message}`);
    // Worker throws bypass Fastify's handler — report them explicitly.
    Sentry.captureException(err, { tags: { area: 'story-worker' }, extra: { jobId: job?.id } });
  });

  // Upsert the daily dispatcher schedule. Safe to call on every boot.
  void getStoryQueue().upsertJobScheduler(
    DISPATCHER_ID,
    { pattern: DISPATCH_PATTERN, tz: 'UTC' },
    {
      name: 'dispatch',
      data: { kind: 'dispatch' } satisfies StoryJobPayload,
      opts: {
        removeOnComplete: { age: 60 * 60 * 24 * 7 },
        removeOnFail:     { age: 60 * 60 * 24 * 14 },
      },
    },
  ).then(() => log(`[story-worker] dispatcher scheduled (${DISPATCH_PATTERN} UTC)`))
   .catch((err: Error) => log(`[story-worker] dispatcher scheduler upsert failed: ${err.message}`));

  return _worker;
}

export async function stopStoryWorker(): Promise<void> {
  await _worker?.close();
  await _queue?.close();
  await _connection?.quit();
  _worker = null;
  _queue = null;
  _connection = null;
}

// ─── Generate job ──────────────────────────────────────────────────────────

async function processGenerateJob(
  job: Job<{ kind: 'generate'; childId: string; monthKey: string }>,
  log: (msg: string, data?: unknown) => void,
): Promise<void> {
  const { childId, monthKey } = job.data;
  log(`[story-worker] start job=${job.id} childId=${childId} monthKey=${monthKey}`);

  // Ensure the story row exists in 'generating' state. Idempotent — re-runs
  // (e.g. retries) just bump status back to 'generating'.
  const child = await prisma.child.findFirst({
    where:  { ...whereNotDeleted, id: childId },
    select: { id: true, name: true, birthDate: true, userId: true },
  });
  if (!child) throw new Error(`Child ${childId} not found`);

  const user = await prisma.user.findFirst({
    where:  { ...whereNotDeleted, id: child.userId },
    select: { timezone: true },
  });
  if (!user) throw new Error(`User ${child.userId} not found`);

  const sub = await prisma.subscription.findUnique({
    where:  { userId: child.userId },
    select: { subscriptionStatus: true, storyQuota: true },
  });
  const isPremium =
    sub?.subscriptionStatus === 'premium_active' ||
    sub?.subscriptionStatus === 'trial_active';

  // Handoff 3.3:Free 共 2 份配额(按账户)。配额尽 → 不生成(quota 从不重置)。
  // 注:regenerate 只有 Premium 能触发(路由已 gate),不会走到这里的扣减分支。
  if (!isPremium && (sub?.storyQuota ?? 0) <= 0) {
    await prisma.story.upsert({
      where:  { childId_monthKey: { childId, monthKey } },
      update: { status: 'failed', generationMeta: { declined: 'FREE_QUOTA_EXHAUSTED' } as object },
      create: { childId, userId: child.userId, monthKey, status: 'failed',
                generationMeta: { declined: 'FREE_QUOTA_EXHAUSTED' } as object },
    });
    log(`[story-worker] skip ${childId}/${monthKey}: free quota exhausted`);
    return;
  }

  await prisma.story.upsert({
    where:  { childId_monthKey: { childId, monthKey } },
    update: { status: 'generating' },
    create: {
      childId,
      userId: child.userId,
      monthKey,
      status: 'generating',
    },
  });

  // Pull moments that fall within `monthKey` in the user's local timezone.
  // We over-fetch with a generous UTC window then filter client-side, since the
  // schema doesn't yet have a generated month_key column.
  const [yStr, mStr] = monthKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const utcStart = new Date(Date.UTC(y, m - 1, 1, -14)); // -14h to cover any tz
  const utcEnd   = new Date(Date.UTC(y, m, 1, 14));

  const rawAssets = await prisma.rawAsset.findMany({
    where: {
      ...whereNotDeleted,
      childId,
      capturedAt: { gte: utcStart, lt: utcEnd },
    },
    include: { files: { orderBy: { displayOrder: 'asc' } } },
    orderBy: { capturedAt: 'asc' },
  });
  const momentsInMonth = rawAssets.filter(
    a => toMonthKey(a.capturedAt, user.timezone) === monthKey,
  );

  const moments: MomentInput[] = momentsInMonth.map(a => ({
    capturedAt: a.capturedAt.toISOString(),
    textNote:   a.textNote,
    tags:       a.tags,
    fileUrls:   a.files.map(f => f.fileUrl),
  }));

  // Cover image: pick the file from the moment with the most photos.
  const covered = [...momentsInMonth].sort((a, b) => b.files.length - a.files.length)[0];
  const candidateCoverImageUrl = covered?.files[0]?.fileUrl ?? null;

  const childAgeMonths = monthsBetween(child.birthDate, new Date(Date.UTC(y, m - 1, 15)));
  const monthLabel = new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const generatedAt = new Date().toISOString();
  const reviewRequired = ['1','true','yes'].includes((process.env.STORY_REVIEW_REQUIRED ?? '').toLowerCase());
  const cfg = getStoryGenConfig();

  try {
    let document: object;
    let meta;

    if (cfg.pipeline === 'two-phase-v3') {
      // v3 两段式流水线;E01/P1 拒绝时标记 failed 并记录原因(不重试)
      const v3Moments: V3Moment[] = momentsInMonth.map(a => ({
        id:         a.id,
        capturedAt: a.capturedAt.toISOString(),
        text:       a.textNote ?? '',
        tags:       a.tags,
        photos: a.files.map(f => ({
          url:      f.fileUrl,
          widthPx:  f.widthPx,
          heightPx: f.heightPx,
          // 预处理产物;未打标的照片 imageLayer 自动降级到分辨率判定
          ...(f.qualityTier ? { qualityTier: f.qualityTier as 'gold' | 'standard' | 'degraded' } : {}),
          ...(f.sharpness != null ? { sharpness: Number(f.sharpness) } : {}),
        })),
      }));
      const result = await generateStoryV3({
        childName:        child.name,
        childAgeMonths,
        monthKey,
        monthDisplay:     monthLabel.toUpperCase(),
        locale:           'en-US',
        moments:         v3Moments,
        watermarkEnabled: !isPremium,
        generatedAt,
      });
      if (!result.ok) {
        await prisma.story.update({
          where: { childId_monthKey: { childId, monthKey } },
          data:  { status: 'failed', generationMeta: { declined: result.reason, detail: result.detail } as object },
        });
        log(`[story-worker] v3 declined ${childId}/${monthKey}: ${result.reason} (${result.detail ?? ''})`);
        return;
      }
      document = result.document;
      meta = result.meta;
    } else {
      const v2 = await generateStory({
        childName:      child.name,
        childAgeMonths,
        monthKey,
        monthLabel,
        locale:         'en-US',
        moments,
        candidateCoverImageUrl,
        watermarkEnabled: !isPremium,
        generatedAt,
      });
      document = v2.document;
      meta = v2.meta;
    }

    // Stitch the DB-derived ids in now that we know them.
    const updated = await prisma.story.update({
      where: { childId_monthKey: { childId, monthKey } },
      data: {
        // §8.2 人工审核:开关开启时先进待审队列,approve 后才对用户可见
        status:         reviewRequired ? 'pending_review' : 'generated',
        qualityLevel:   meta.qualityLevel,
        qualityScore:   meta.qualityScore,
        promptVersion:  meta.promptVersion,
        modelName:      meta.modelName,
        generatedAt:    new Date(generatedAt),
        generatedUnderPlan: isPremium ? 'premium' : 'free',
        document:       { ...document, childId } as unknown as object,
        generationMeta: meta as unknown as object,
      },
    });
    // Backfill storyId now that we have the row id.
    await prisma.story.update({
      where: { id: updated.id },
      data:  { document: { ...document, childId, storyId: updated.id } as unknown as object },
    });

    // Free 生成成功 → 扣 1 份配额;降到 0 的这份标记 isLastFreeStory
    // (Paywall A 触发点:看完最后一份免费 Story 返回时弹,mobile 读此标记)。
    if (!isPremium) {
      const after = await prisma.subscription.update({
        where: { userId: child.userId },
        data:  { storyQuota: { decrement: 1 } },
        select: { storyQuota: true },
      });
      if (after.storyQuota <= 0) {
        await prisma.story.update({
          where: { id: updated.id },
          data:  { isLastFreeStory: true },
        });
      }
      log(`[story-worker] free quota now ${after.storyQuota} for user=${child.userId}`);
    }

    // 审核开启时等 approve 再推(内部端点负责);否则立即通知家长
    if (!reviewRequired) {
      const sent = await sendStoryReadyPush(
        child.userId,
        { childName: child.name, storyId: updated.id, monthKey },
        (m) => log(m),
      );
      if (sent > 0) log(`[story-worker] story-ready push → ${sent} device(s)`);
    }

    log(`[story-worker] generated story=${updated.id} duration_ms=${meta.generationDurationMs}`);
  } catch (err) {
    await prisma.story.update({
      where: { childId_monthKey: { childId, monthKey } },
      data:  { status: 'failed' },
    });
    throw err;
  }
}

function monthsBetween(birthDate: Date, anchor: Date): number {
  const years  = anchor.getUTCFullYear() - birthDate.getUTCFullYear();
  const months = anchor.getUTCMonth()    - birthDate.getUTCMonth();
  return Math.max(0, years * 12 + months);
}

// ─── Dispatcher ────────────────────────────────────────────────────────────

/**
 * Fired daily. For each non-deleted child, computes the previous calendar
 * month in their user's timezone and enqueues a generate job if:
 *   - no story row exists yet for that (childId, monthKey), OR
 *   - the existing story status is 'failed' (retry on the next sweep)
 *
 * This is intentionally a simple full-table scan — works fine up to thousands
 * of children. When that becomes slow, add a `next_story_eligible_at` column
 * and filter on it.
 */
async function runDispatcher(log: (msg: string, data?: unknown) => void): Promise<void> {
  log('[story-worker] dispatcher tick');

  const children = await prisma.child.findMany({
    where:  whereNotDeleted,
    select: {
      id: true,
      user: { select: { id: true, timezone: true, deletedAt: true } },
    },
  });

  let enqueued = 0;
  let skipped  = 0;

  for (const child of children) {
    if (child.user.deletedAt) { skipped++; continue; }

    const prevMonthKey = previousMonthKey(child.user.timezone);

    const existing = await prisma.story.findUnique({
      where:  { childId_monthKey: { childId: child.id, monthKey: prevMonthKey } },
      select: { status: true },
    });
    if (existing && existing.status !== 'failed') { skipped++; continue; }

    // Don't bother enqueueing a story for a month with zero moments — no
    // point spending tokens on "the month was quiet" for someone who hasn't
    // captured anything yet. The worker handles 0-moment cases gracefully if
    // a manual trigger fires it anyway.
    const memCount = await prisma.rawAsset.count({
      where: { ...whereNotDeleted, childId: child.id },
    });
    if (memCount === 0) { skipped++; continue; }

    await enqueueStoryGeneration({ childId: child.id, monthKey: prevMonthKey });
    enqueued++;
  }

  log(`[story-worker] dispatcher done — enqueued=${enqueued} skipped=${skipped}`);

  await runUploadReminders(log);
}

/**
 * Upload Reminders(ST-Settings annotation):连续 3 天没上传任何 Moment,
 * 且这 3 天内没有 Story 生成过 → 发一条温和提醒。跟着每日 dispatcher 跑。
 * 开关关闭 / 无 token 的用户由 sendPushToUser 内部跳过。
 */
async function runUploadReminders(log: (msg: string, data?: unknown) => void): Promise<void> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      ...whereNotDeleted,
      uploadRemindersEnabled: true,
      pushTokens: { some: {} },          // 没设备的不查
      children:   { some: { deletedAt: null } },
      // 3 天内无上传
      rawAssets:  { none: { createdAt: { gte: threeDaysAgo }, deletedAt: null } },
      // 3 天内无 Story 生成(annotation:刚出 Story 的用户不催)
      stories:    { none: { generatedAt: { gte: threeDaysAgo } } },
    },
    select: { id: true },
  });

  let sent = 0;
  for (const u of users) {
    const n = await sendPushToUser(u.id, 'upload_reminder', {
      title: 'Turn every moment into a moment',
      body:  'A photo or a quick note :)',
      data:  { type: 'upload_reminder' },
    }, (m) => log(m));
    if (n > 0) sent += 1;
  }
  log(`[story-worker] upload reminders — ${sent}/${users.length} user(s) notified`);
}

function previousMonthKey(timezone: string): string {
  const now = new Date();
  // Anchor to the 15th of the previous month in UTC and reformat in the user's
  // tz. Picking the middle of the month avoids any DST/edge weirdness.
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
  return toMonthKey(anchor, timezone);
}
