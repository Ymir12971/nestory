import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { User, LinkedProvider } from '@nestory/types';
import { prisma, whereNotDeleted } from '../lib/prisma';
import { Errors } from '../lib/errors';
import { parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

const userPatchSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(50).optional(),
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
      createdAt:   row.createdAt.toISOString(),
      linkedProviders: row.linkedProviders.map((p): LinkedProvider => ({
        provider:      p.provider as 'apple' | 'google',
        providerEmail: p.providerEmail,
        connectedAt:   p.connectedAt.toISOString(),
      })),
    };
    return { data };
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
    // TODO: 同步触发 Supabase signOut（client side）
    return { data: { deletedAt: deletedAt.toISOString() } };
  });
}
