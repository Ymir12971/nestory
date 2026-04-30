import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { loadEnv } from './config/env';

const env = loadEnv();
const app = Fastify({
  logger: { level: env.LOG_LEVEL },
});

await app.register(cors, { origin: env.CORS_ORIGIN });
await app.register(sensible);

app.get('/health', async () => ({ status: 'ok', service: 'nestory-api' }));

const port = Number(env.PORT);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
