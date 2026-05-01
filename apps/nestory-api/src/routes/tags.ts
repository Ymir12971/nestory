import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';
import { parseParams } from '../lib/validation';

/**
 * 8 个预设 Tag — Source of Truth
 * 文档约定移到 packages/config/nestory/tags.ts；MVP 阶段先内联。
 */
const PRESET_TAGS = [
  'Playtime',
  'Mealtime',
  'Bedtime',
  'Bath Time',
  'Outdoor',
  'Family Time',
  'Funny Moment',
  'Learning',
] as const;

export async function tagsRoutes(app: FastifyInstance) {
  // GET /tags — 8 个预设标签（静态返回，不查 DB）
  app.get('/', async () => ({
    data: PRESET_TAGS,
    meta: { timestamp: new Date().toISOString() },
  }));

  // GET /tags/user — 用户自定义 tag library
  app.get('/user', async (req) => {
    const tags = await prisma.userTagLibrary.findMany({
      where:   { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select:  { name: true, createdAt: true },
    });
    return {
      data: tags,
      meta: { timestamp: new Date().toISOString() },
    };
  });

  // DELETE /tags/user/:name — 从 library 移除（orphan chip 语义：已存入 raw_assets.tags 不受影响）
  app.delete('/user/:name', async (req) => {
    const { name } = parseParams(z.object({ name: z.string().min(1).max(50) }), req);
    const normalized = name.trim().toLowerCase();

    // 用 raw 查 id（match LOWER(TRIM(name)) unique 索引），再走 Prisma delete
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM user_tag_library
      WHERE user_id = ${req.userId}::uuid
        AND LOWER(TRIM(name)) = ${normalized}
      LIMIT 1
    `;
    if (rows.length === 0) throw Errors.notFound('Tag', name);

    await prisma.userTagLibrary.delete({ where: { id: rows[0]!.id } });
    return { data: { deleted: 1 } };
  });
}
