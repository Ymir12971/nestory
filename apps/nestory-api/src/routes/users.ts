import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { User, LinkedProvider } from '@nestory/types';
import { prisma, whereNotDeleted } from '../lib/prisma';
import { Errors } from '../lib/errors';
import { parseBody } from '../lib/validation';
import { audit } from '../lib/audit';
import { getSupabase } from '../lib/supabase';

const userPatchSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(50).optional(),
  storyNotificationsEnabled: z.boolean().optional(),
  uploadRemindersEnabled:    z.boolean().optional(),
});

const pushTokenSchema = z.object({
  token:    z.string().min(1).max(200),
  platform: z.enum(['ios', 'android', 'web']),
});

export async function usersRoutes(app: FastifyInstance) {
  // GET /users/me — 当前用户 profile + linkedProviders
  app.get('/me', async (req): Promise<{ data: User }> => {
    const row = await prisma.user.findFirst({
      where:   { ...whereNotDeleted, id: req.userId },
      include: {
        linkedProviders: {
          select: { provider: true, providerEmail: true, connectedAt: true },
        },
      },
    });
    if (!row) throw Errors.notFound('User', req.userId);

    const data: User = {
      id:          row.id,
      email:       row.email,
      name:        row.name,
      timezone:    row.timezone,
      storyNotificationsEnabled: row.storyNotificationsEnabled,
      uploadRemindersEnabled:    row.uploadRemindersEnabled,
      createdAt:   row.createdAt.toISOString(),
      linkedProviders: row.linkedProviders.map((p): LinkedProvider => ({
        provider:      p.provider as 'apple' | 'google',
        providerEmail: p.providerEmail,
        connectedAt:   p.connectedAt.toISOString(),
      })),
    };
    return { data };
  });

  // PATCH /users/me — 改名 / timezone
  app.patch('/me', async (req): Promise<{ data: User }> => {
    const body = parseBody(userPatchSchema, req);
    const row = await prisma.user.update({
      where: { id: req.userId },
      data:  body,
      include: {
        linkedProviders: {
          select: { provider: true, providerEmail: true, connectedAt: true },
        },
      },
    });
    const data: User = {
      id:          row.id,
      email:       row.email,
      name:        row.name,
      timezone:    row.timezone,
      storyNotificationsEnabled: row.storyNotificationsEnabled,
      uploadRemindersEnabled:    row.uploadRemindersEnabled,
      createdAt:   row.createdAt.toISOString(),
      linkedProviders: row.linkedProviders.map((p): LinkedProvider => ({
        provider:      p.provider as 'apple' | 'google',
        providerEmail: p.providerEmail,
        connectedAt:   p.connectedAt.toISOString(),
      })),
    };
    return { data };
  });

  // POST /users/me/push-token — 注册/刷新本设备的 Expo 推送 token(upsert)。
  // token 全局唯一:同一台设备换账号登录时,token 归属转移到新用户。
  app.post('/me/push-token', async (req) => {
    const body = parseBody(pushTokenSchema, req);
    await prisma.pushToken.upsert({
      where:  { token: body.token },
      update: { userId: req.userId, platform: body.platform },
      create: { userId: req.userId, token: body.token, platform: body.platform },
    });
    return { data: { registered: true } };
  });

  // DELETE /users/me/push-token — 登出时注销本设备 token
  app.delete('/me/push-token', async (req) => {
    const body = parseBody(z.object({ token: z.string().min(1).max(200) }), req);
    await prisma.pushToken.deleteMany({ where: { token: body.token, userId: req.userId } });
    return { data: { removed: true } };
  });

  // DELETE /users/me — 软删（注销账号，30 天恢复窗）
  app.delete('/me', async (req) => {
    const deletedAt = new Date();
    await prisma.user.update({
      where: { id: req.userId },
      data:  { deletedAt },
    });
    audit({
      userId:    req.userId,
      actorType: 'user',
      action:    'delete_account',
      resource:  'user',
      resourceId: req.userId,
      req,
    });

    // Revoke every Supabase session for this user so they're signed out on
    // every device — the client also calls auth.signOut, but we shouldn't
    // trust that path alone. Best-effort: the user row is already soft-deleted
    // so the request returns successfully even if Supabase rejects.
    const authHeader = req.headers.authorization;
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (jwt && !jwt.startsWith('dev-')) {
      try {
        await getSupabase().auth.admin.signOut(jwt, 'global');
      } catch (err) {
        req.log.warn({ err }, 'Supabase admin signOut failed after delete_account');
      }
    }
    return { data: { deletedAt: deletedAt.toISOString() } };
  });
}
