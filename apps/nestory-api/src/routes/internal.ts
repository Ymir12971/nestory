import type { FastifyInstance } from 'fastify';
import { ApiError } from '../lib/errors';

const TODO = (path: string) => () => {
  throw new ApiError('INTERNAL_ERROR', `TODO: implement ${path}`, 501);
};

/**
 * 决策 4：内部控制平面，admin token 鉴权（不暴露给 client）。
 * TODO: 加 admin auth hook（与 user auth plugin 区分）。
 */
export async function internalRoutes(app: FastifyInstance) {
  // POST /internal/stories/enqueue — batch enqueue with filter (region/quantity/dryRun)
  app.post('/stories/enqueue', TODO('POST /internal/stories/enqueue'));

  // POST /internal/stories/retry — retry failed jobs
  app.post('/stories/retry', TODO('POST /internal/stories/retry'));

  // POST /internal/stories/cancel — cancel queued jobs by id
  app.post('/stories/cancel', TODO('POST /internal/stories/cancel'));

  // GET /internal/stories/queue — pending/active/failed counts
  app.get('/stories/queue', TODO('GET /internal/stories/queue'));

  // GET /internal/stories/jobs/:id — single job detail
  app.get('/stories/jobs/:id', TODO('GET /internal/stories/jobs/:id'));
}
