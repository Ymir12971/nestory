import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Errors } from '../lib/errors';
import { parseBody, parseParams } from '../lib/validation';
import { prisma, whereNotDeleted } from '../lib/prisma';
import { enqueueStoryGeneration, getStoryQueue } from '../lib/storyQueue';
import { toMonthKey } from '../lib/month';

const generateBody = z.object({
  childId:  z.string().uuid(),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
});

const enqueueBody = z.object({
  // Filter selectors — at least one of childIds or "all active children"
  // (achieved by passing an empty filter object). Future filters (region,
  // ageMonthsRange, plan) plug in here without touching call sites.
  filter: z.object({
    childIds: z.array(z.string().uuid()).optional(),
  }).default({}),
  // Override target monthKey. Defaults to previous calendar month in UTC, which
  // matches the dispatcher's daily behavior. Manual triggers normally pass a
  // specific monthKey (e.g. backfill for May after a partial outage).
  monthKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  // Cap to prevent enqueue storms when the filter accidentally matches everyone.
  batchSize: z.number().int().positive().max(10_000).default(1000),
  // Inspect what would be enqueued without actually queueing.
  dryRun:   z.boolean().default(false),
});

const retryBody = z.object({
  // Empty body retries all currently-failed jobs. Pass jobIds to scope the retry.
  jobIds: z.array(z.string()).optional(),
});

const cancelBody = z.object({
  jobIds: z.array(z.string()).min(1),
});

const jobIdParam = z.object({ id: z.string().min(1) });

/**
 * 决策 4：内部控制平面，admin token 鉴权（不暴露给 client）。
 * TODO: 加 admin auth hook（与 user auth plugin 区分）。
 */
export async function internalRoutes(app: FastifyInstance) {
  // POST /internal/stories/generate — enqueue a single story generation job.
  // Idempotent on (childId, monthKey): a second call while the first is still
  // queued/running collapses to the same BullMQ job id.
  app.post('/stories/generate', async (req, reply) => {
    const body  = parseBody(generateBody, req);
    const jobId = await enqueueStoryGeneration(body);
    reply.code(202);
    return { data: { jobId, ...body } };
  });

  // GET /internal/stories/queue — pending/active/failed counts
  app.get('/stories/queue', async () => {
    const queue  = getStoryQueue();
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return { data: counts };
  });

  // POST /internal/stories/enqueue — batch enqueue across a child filter.
  // Mirrors the daily dispatcher's logic but exposes it as an admin RPC for
  // backfills, manual reruns, and dry-run inspection.
  app.post('/stories/enqueue', async (req, reply) => {
    const body = parseBody(enqueueBody, req);

    // Resolve target children: explicit list, or all non-deleted children
    // belonging to non-deleted users.
    const where = body.filter.childIds && body.filter.childIds.length > 0
      ? { ...whereNotDeleted, id: { in: body.filter.childIds } }
      : { ...whereNotDeleted };

    const candidates = await prisma.child.findMany({
      where,
      select: {
        id: true,
        user: { select: { id: true, timezone: true, deletedAt: true } },
      },
      take: body.batchSize,
    });

    const targets: { childId: string; monthKey: string }[] = [];
    for (const c of candidates) {
      if (c.user.deletedAt) continue;
      const monthKey = body.monthKey ?? previousMonthKey(c.user.timezone);
      targets.push({ childId: c.id, monthKey });
    }

    if (body.dryRun) {
      return {
        data: {
          matched:  targets.length,
          enqueued: 0,
          dryRun:   true,
          sample:   targets.slice(0, 10),
        },
      };
    }

    const enqueued: { childId: string; monthKey: string; jobId: string }[] = [];
    for (const t of targets) {
      const jobId = await enqueueStoryGeneration(t);
      enqueued.push({ ...t, jobId });
    }

    reply.code(202);
    return {
      data: {
        matched:  targets.length,
        enqueued: enqueued.length,
        dryRun:   false,
        sample:   enqueued.slice(0, 10),
      },
    };
  });

  // POST /internal/stories/retry — retry failed jobs. Without a body, retries
  // every currently-failed job (typical use after fixing a transient outage).
  // With `jobIds`, retries only those.
  app.post('/stories/retry', async (req, reply) => {
    const body  = parseBody(retryBody, req);
    const queue = getStoryQueue();

    const targetIds = body.jobIds && body.jobIds.length > 0
      ? body.jobIds
      : (await queue.getFailed(0, -1)).map(j => j.id).filter((id): id is string => !!id);

    let retried = 0;
    let missing = 0;
    for (const id of targetIds) {
      const job = await queue.getJob(id);
      if (!job) { missing++; continue; }
      await job.retry();
      retried++;
    }

    reply.code(202);
    return { data: { retried, missing, requested: targetIds.length } };
  });

  // POST /internal/stories/cancel — remove queued/delayed jobs by id. No-op for
  // jobs that are already running (BullMQ doesn't kill in-flight workers).
  app.post('/stories/cancel', async (req) => {
    const body  = parseBody(cancelBody, req);
    const queue = getStoryQueue();

    let cancelled = 0;
    let missing   = 0;
    for (const id of body.jobIds) {
      const job = await queue.getJob(id);
      if (!job) { missing++; continue; }
      await job.remove();
      cancelled++;
    }

    return { data: { cancelled, missing, requested: body.jobIds.length } };
  });

  // GET /internal/stories/jobs/:id — single job detail.
  app.get('/stories/jobs/:id', async (req) => {
    const { id } = parseParams(jobIdParam, req);
    const job    = await getStoryQueue().getJob(id);
    if (!job) throw Errors.notFound('Job', id);

    const state = await job.getState();
    return {
      data: {
        id:            job.id,
        name:          job.name,
        data:          job.data,
        state,
        attemptsMade:  job.attemptsMade,
        processedOn:   job.processedOn ?? null,
        finishedOn:    job.finishedOn ?? null,
        failedReason:  job.failedReason ?? null,
        returnvalue:   job.returnvalue ?? null,
        progress:      job.progress,
        timestamp:     job.timestamp,
      },
    };
  });
}

function previousMonthKey(timezone: string): string {
  const now = new Date();
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
  return toMonthKey(anchor, timezone);
}
