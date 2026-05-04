import type { FastifyInstance } from 'fastify';
import { usersRoutes } from './users';
import { childrenRoutes } from './children';
import { assetsRoutes } from './assets';
import { highlightsRoutes } from './highlights';
import { storiesRoutes } from './stories';
import { subscriptionsRoutes } from './subscriptions';
import { sharesRoutes } from './shares';
import { tagsRoutes } from './tags';
import { uploadsRoutes } from './uploads';
import { internalRoutes } from './internal';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(usersRoutes,         { prefix: '/users' });
  await app.register(childrenRoutes,      { prefix: '/children' });
  await app.register(assetsRoutes,        { prefix: '/assets' });
  await app.register(highlightsRoutes,    { prefix: '/highlights' });
  await app.register(storiesRoutes,       { prefix: '/stories' });
  await app.register(subscriptionsRoutes, { prefix: '/subscriptions' });
  await app.register(sharesRoutes,        { prefix: '/shares' });
  await app.register(tagsRoutes,          { prefix: '/tags' });
  await app.register(uploadsRoutes,       { prefix: '/uploads' });
  await app.register(internalRoutes,      { prefix: '/internal' });
}
