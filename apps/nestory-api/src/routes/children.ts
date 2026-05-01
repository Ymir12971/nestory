import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, whereNotDeleted } from '../lib/prisma';
import { ApiError, Errors } from '../lib/errors';
import { parseBody, parseParams, uuidParam } from '../lib/validation';

// ---------- Schemas ----------

const childCreateSchema = z.object({
  name:             z.string().min(1).max(50),
  birthDate:        z.string().date(), // 'YYYY-MM-DD'
  gender:           z.enum(['boy', 'girl', 'prefer_not_to_say']).optional(),
  avatarUrl:        z.string().url().max(500).optional(),
  heightValue:      z.number().positive().optional(),
  heightUnit:       z.enum(['cm', 'in']).optional(),
  weightValue:      z.number().positive().optional(),
  weightUnit:       z.enum(['kg', 'lb']).optional(),
});

const childPatchSchema = childCreateSchema.partial();

const setActiveSchema = z.object({
  childId: z.string().uuid(),
});

// ---------- Serializer ----------

function serializeChild(c: any) {
  return {
    id:               c.id,
    name:             c.name,
    birthDate:        c.birthDate.toISOString().slice(0, 10), // YYYY-MM-DD
    avatarUrl:        c.avatarUrl,
    gender:           c.gender,
    heightValue:      c.heightValue ? Number(c.heightValue) : null,
    heightUnit:       c.heightUnit,
    heightRecordedAt: c.heightRecordedAt?.toISOString() ?? null,
    weightValue:      c.weightValue ? Number(c.weightValue) : null,
    weightUnit:       c.weightUnit,
    weightRecordedAt: c.weightRecordedAt?.toISOString() ?? null,
    isActive:         false, // 由 caller 注入（要 join users.activeChildId）
    createdAt:        c.createdAt.toISOString(),
  };
}

// ---------- Routes ----------

export async function childrenRoutes(app: FastifyInstance) {
  // POST /children — 创建档案
  app.post('/', async (req, reply) => {
    const body = parseBody(childCreateSchema, req);
    const now  = new Date();

    const child = await prisma.child.create({
      data: {
        userId:           req.userId,
        name:             body.name,
        birthDate:        new Date(body.birthDate),
        gender:           body.gender,
        avatarUrl:        body.avatarUrl,
        heightValue:      body.heightValue,
        heightUnit:       body.heightUnit,
        heightRecordedAt: body.heightValue ? now : null,
        weightValue:      body.weightValue,
        weightUnit:       body.weightUnit,
        weightRecordedAt: body.weightValue ? now : null,
      },
    });
    reply.code(201);
    return { data: serializeChild(child) };
  });

  // GET /children — 列档案（不含软删）
  app.get('/', async (req) => {
    const [children, user] = await Promise.all([
      prisma.child.findMany({
        where:   { ...whereNotDeleted, userId: req.userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.findFirst({
        where:  { ...whereNotDeleted, id: req.userId },
        select: { activeChildId: true },
      }),
    ]);

    return {
      data: children.map(c => ({
        ...serializeChild(c),
        isActive: c.id === user?.activeChildId,
      })),
    };
  });

  // GET /children/:id
  app.get('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const child = await prisma.child.findFirst({
      where: { ...whereNotDeleted, id, userId: req.userId },
    });
    if (!child) throw Errors.notFound('Child', id);

    const user = await prisma.user.findFirst({
      where:  { ...whereNotDeleted, id: req.userId },
      select: { activeChildId: true },
    });

    return {
      data: { ...serializeChild(child), isActive: child.id === user?.activeChildId },
    };
  });

  // PATCH /children/:id — 更新档案
  app.patch('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const body   = parseBody(childPatchSchema, req);
    const now    = new Date();

    // 校验所有权 + 未软删
    const existing = await prisma.child.findFirst({
      where:  { ...whereNotDeleted, id, userId: req.userId },
      select: { id: true },
    });
    if (!existing) throw Errors.notFound('Child', id);

    const updated = await prisma.child.update({
      where: { id },
      data: {
        ...body,
        birthDate:        body.birthDate ? new Date(body.birthDate) : undefined,
        heightRecordedAt: body.heightValue !== undefined ? now : undefined,
        weightRecordedAt: body.weightValue !== undefined ? now : undefined,
      },
    });
    return { data: serializeChild(updated) };
  });

  // DELETE /children/:id — 软删
  app.delete('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const force  = (req.query as { hard?: string })?.hard === 'true';

    const existing = await prisma.child.findFirst({
      where:  { id, userId: req.userId },
      select: { id: true, deletedAt: true },
    });
    if (!existing) throw Errors.notFound('Child', id);

    if (force) {
      await prisma.child.delete({ where: { id } });
      return { data: { hardDeleted: true } };
    }

    await prisma.child.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });
    return { data: { deletedAt: new Date().toISOString() } };
  });

  // POST /children/:id/restore — 恢复软删
  app.post('/:id/restore', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const existing = await prisma.child.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) throw Errors.notFound('Child', id);
    if (!existing.deletedAt) throw Errors.validation('Child is not soft-deleted');

    const restored = await prisma.child.update({
      where: { id },
      data:  { deletedAt: null },
    });
    return { data: serializeChild(restored) };
  });

  // PATCH /children/active — 切换活跃档案；R-05 拒绝 never_paid 多档切换
  app.patch('/active', async (req) => {
    const { childId } = parseBody(setActiveSchema, req);

    const [child, sub] = await Promise.all([
      prisma.child.findFirst({
        where: { ...whereNotDeleted, id: childId, userId: req.userId },
      }),
      prisma.subscription.findUnique({ where: { userId: req.userId } }),
    ]);
    if (!child) throw Errors.notFound('Child', childId);

    // R-05：never_paid 用户不能切换到非 active 档案
    if (sub?.subscriptionStatus === 'never_paid') {
      const user = await prisma.user.findFirst({
        where:  { ...whereNotDeleted, id: req.userId },
        select: { activeChildId: true },
      });
      if (user?.activeChildId && user.activeChildId !== childId) {
        throw new ApiError(
          'PROFILE_SWITCH_RESTRICTED',
          'Free users cannot switch profiles. Upgrade to Premium to manage multiple children.',
          403,
        );
      }
    }

    await prisma.user.update({
      where: { id: req.userId },
      data:  { activeChildId: childId },
    });
    return { data: { activeChildId: childId } };
  });
}
