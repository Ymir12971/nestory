import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { loadEnv } from './config/env';
import { errorHandler } from './lib/errors';
import authPlugin from './lib/auth';
import { registerRoutes } from './routes';

const env = loadEnv();
const app = Fastify({
  logger: { level: env.LOG_LEVEL },
});

await app.register(cors, { origin: env.CORS_ORIGIN });
await app.register(sensible);
await app.register(authPlugin);

app.setErrorHandler(errorHandler);

app.get('/health', async () => ({ status: 'ok', service: 'nestory-api' }));

await registerRoutes(app);

const port = Number(env.PORT);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
