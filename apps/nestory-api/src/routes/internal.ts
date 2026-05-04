import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../lib/errors';
import { parseBody } from '../lib/validation';
import { enqueueStoryGeneration, getStoryQueue } from '../lib/storyQueue';

const TODO = (path: string) => () => {
  throw new ApiError('INTERNAL_ERROR', `TODO: implement ${path}`, 501);
};

const generateBody = z.object({
  childId:  z.string().uuid(),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
});

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

  // POST /internal/stories/enqueue — batch enqueue with filter (region/quantity/dryRun)
  app.post('/stories/enqueue', TODO('POST /internal/stories/enqueue'));

  // POST /internal/stories/retry — retry failed jobs
  app.post('/stories/retry', TODO('POST /internal/stories/retry'));

  // POST /internal/stories/cancel — cancel queued jobs by id
  app.post('/stories/cancel', TODO('POST /internal/stories/cancel'));

  // GET /internal/stories/jobs/:id — single job detail
  app.get('/stories/jobs/:id', TODO('GET /internal/stories/jobs/:id'));
}
