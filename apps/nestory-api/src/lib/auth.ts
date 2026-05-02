import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { Errors } from './errors';

/**
 * Auth plugin — decorates `request.userId` after verifying token.
 *
 * Dev mode (NODE_ENV !== 'production'):
 *   `Authorization: Bearer dev-<userId>` → 直接拿 <userId>，无需 Supabase
 *
 * Production:
 *   `Authorization: Bearer <Supabase JWT>` → 调 Supabase verify，提取 sub
 *   TODO: 接 SUPABASE_SERVICE_KEY + jose 验签，DB 已配好后实现
 */
async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('userId', '');

  app.addHook('preHandler', async (req) => {
    // 跳过不需要鉴权的路径
    if (req.url === '/health') return;
    if (req.url.startsWith('/shares/public/')) return; // 公网分享页
    if (req.url.startsWith('/subscriptions/sync')) return; // RevenueCat webhook (走签名校验)
    if (req.url.startsWith('/internal/')) return;
    // /internal/* 走单独的 admin token 校验（TODO）

    const token = extractBearer(req);
    if (!token) throw Errors.unauthorized('Missing Authorization header');

    if (process.env.NODE_ENV !== 'production' && token.startsWith('dev-')) {
      req.userId = token.slice(4);
      return;
    }

    // TODO: production — Supabase JWT 验签
    // const { data, error } = await supabase.auth.getUser(token);
    // if (error) throw Errors.unauthorized('Invalid token');
    // req.userId = data.user.id;

    throw Errors.unauthorized('Auth not yet wired (waiting on Supabase setup)');
  });
}

function extractBearer(req: FastifyRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export default fp(authPlugin, { name: 'auth' });
