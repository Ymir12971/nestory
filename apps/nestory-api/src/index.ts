import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { loadEnv } from './config/env';
import { errorHandler } from './lib/errors';
import authPlugin from './lib/auth';
import { registerRateLimit } from './lib/rateLimit';
import { ensureBuckets } from './lib/supabase';
import { startStoryWorker } from './lib/storyQueue';
import { isMockEnabled } from './lib/storyAi';
import { registerRoutes } from './routes';

const env = loadEnv();
const app = Fastify({
  logger: { level: env.LOG_LEVEL },
});

await app.register(cors, { origin: env.CORS_ORIGIN });
await app.register(sensible);
await app.register(authPlugin);
// Rate limit runs at preHandler — registered AFTER auth so req.userId is set
// before the limiter's key generator looks at it.
await registerRateLimit(app);

app.setErrorHandler(errorHandler);

app.get('/health', async () => ({ status: 'ok', service: 'nestory-api' }));

await registerRoutes(app);

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
  try {
    await ensureBuckets((msg) => app.log.info(`[storage] ${msg}`));
  } catch (err) {
    app.log.error({ err }, 'Failed to bootstrap Supabase Storage buckets');
  }
} else {
  app.log.warn('SUPABASE_URL / SUPABASE_SERVICE_KEY missing — /uploads/sign will fail');
}

if (env.REDIS_URL && (env.ANTHROPIC_API_KEY || isMockEnabled())) {
  try {
    startStoryWorker((msg) => app.log.info(msg));
    const mode = isMockEnabled() ? 'MOCK' : 'live';
    app.log.info(`[story-worker] started (concurrency=1, ${mode} generation)`);
  } catch (err) {
    app.log.error({ err }, 'Failed to start story worker');
  }
} else if (!env.REDIS_URL) {
  app.log.warn('REDIS_URL missing — story worker disabled');
} else {
  app.log.warn('ANTHROPIC_API_KEY missing — set STORY_AI_MOCK=1 to enable mock generation');
}

const port = Number(env.PORT);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
