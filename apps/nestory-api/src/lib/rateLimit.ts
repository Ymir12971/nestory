import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import rateLimit from '@fastify/rate-limit';
import IORedis from 'ioredis';
import { prisma } from './prisma';

/**
 * Rate limiting + abuse logging.
 *
 * @fastify/rate-limit gives us a per-route declarative ceiling. We anchor the
 * key on `request.userId` (set by the auth plugin) and fall back to IP for
 * unauth'd routes — that way one user can't burn through the limit by churning
 * IPs, and one IP can't burn it on behalf of every user.
 *
 * On any 429, we asynchronously write to abuse_log so the data team can see
 * patterns (e.g. one user hammering /uploads/sign) without grepping
 * application logs. The write is fire-and-forget — abuse_log being slow must
 * never delay the 429 response.
 *
 * Storage: Redis when REDIS_URL is set (so a multi-instance API shares the
 * counter), in-memory otherwise (single dev process). The plugin handles
 * both transparently when given a `redis` option.
 *
 * Defaults are conservative; tune via routeConfig per endpoint:
 *   fastify.post('/x', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, ...)
 */

const DEFAULT_MAX         = 600;        // global ceiling, per actor, per minute
const DEFAULT_WINDOW_MS   = 60 * 1000;
const ABUSE_TYPE          = 'rate_limit_429';

export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  const redis = redisUrl
    ? new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        // Crucial for @fastify/rate-limit: use a different connection mode
        // than BullMQ's blocking calls. Bound to a single key namespace so
        // BullMQ keys and rate keys don't collide.
        connectTimeout: 5000,
        keyPrefix: 'rl:',
      })
    : undefined;

  await app.register(rateLimit, {
    max:        DEFAULT_MAX,
    timeWindow: DEFAULT_WINDOW_MS,
    redis,
    nameSpace:  'nestory-rl-',
    // Run after auth (preHandler) so req.userId is populated. The default
    // onRequest fires too early — keyGenerator would only see IPs.
    hook:       'preHandler',
    keyGenerator(req) {
      // Anchor on userId when authed; fall back to IP. The auth plugin runs
      // BEFORE rate-limit's onRequest hook in Fastify's lifecycle order, so by
      // the time keyGenerator fires, req.userId is populated for authed routes.
      // For unauth'd paths (/health, /shares/public/*, the auth plugin skips
      // these and userId stays empty string — anchor on IP for those.
      const userId = (req as FastifyRequest).userId;
      if (userId && userId.length > 0) return `u:${userId}`;
      return `ip:${req.ip}`;
    },
    onExceeded(req, key) {
      req.log.info({ key, url: req.url }, 'rate limit exceeded — writing abuse_log');
      // key is e.g. "u:<uuid>" or "ip:<addr>"; surface both for the analyst.
      const userId = key.startsWith('u:') ? key.slice(2) : null;
      const ipAddr = key.startsWith('ip:') ? key.slice(3) : (req.ip ?? null);
      void writeAbuse({
        userId,
        ipAddr:  ipAddr ?? '0.0.0.0', // schema requires non-null Inet
        endpoint: req.url,
        triggerType: ABUSE_TYPE,
        detail: {
          method:    req.method,
          userAgent: req.headers['user-agent'] ?? null,
        },
      }).catch((err) => req.log.warn({ err }, 'abuse_log write failed'));
    },
  });
}

interface AbuseEvent {
  userId:      string | null;
  ipAddr:      string;
  endpoint:    string;
  triggerType: string;
  detail?:     Record<string, unknown>;
}

async function writeAbuse(e: AbuseEvent): Promise<void> {
  await prisma.abuseLog.create({
    data: {
      userId:      e.userId,
      ipAddr:      e.ipAddr,
      endpoint:    e.endpoint.slice(0, 100),
      triggerType: e.triggerType,
      ...(e.detail ? { detail: e.detail as Prisma.InputJsonValue } : {}),
    },
  });
}
