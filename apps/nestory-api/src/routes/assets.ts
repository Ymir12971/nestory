import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Memory, MemoryFile, MimeType } from '@nestory/types';
import { prisma, whereNotDeleted } from '../lib/prisma';
import { ApiError, Errors } from '../lib/errors';
import { parseBody, parseParams, parseQuery, uuidParam, cursorPagination } from '../lib/validation';
import { isCurrentMonth } from '../lib/month';

// ---------- Schemas ----------

const fileInputSchema = z.object({
  fileUrl:      z.string().url().max(500),
  storagePath:  z.string().min(1).max(500),
  mimeType:     z.enum(['image/jpeg', 'image/png', 'image/heif']),
  widthPx:      z.number().int().positive().nullish(),
  heightPx:     z.number().int().positive().nullish(),
  byteSize:     z.number().int().positive().max(10 * 1024 * 1024), // R-07 ≤ 10 MB
  displayOrder: z.number().int().min(0).max(9).optional(),
});

const memoryCreateSchema = z.object({
  childId:     z.string().uuid(),
  capturedAt:  z.string().datetime(),
  textNote:    z.string().max(500).optional(),
  tagValues:   z.array(z.string().min(1).max(50)).max(20).optional(),
  isHighlight: z.boolean().optional(),
  files:       z.array(fileInputSchema).max(10).optional(), // R-07 ≤ 10 张
});

// Highlight toggle 走 POST /highlights（配额校验），不在 PATCH 里处理
const memoryPatchSchema = z.object({
  textNote:        z.string().max(500).optional(),
  tagValues:       z.array(z.string().min(1).max(50)).max(20).optional(),
  addFiles:        z.array(fileInputSchema).optional(),
  removeFileIds:   z.array(z.string().uuid()).optional(),
  reorderFileIds:  z.array(z.string().uuid()).optional(),
});

const listQuery = cursorPagination.extend({
  childId: z.string().uuid(),
  month:   z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

const trashQuery = cursorPagination.extend({
  childId: z.string().uuid().optional(),
});

// ---------- Serializer ----------

function serializeMemory(row: any): Memory {
  return {
    id:            row.id,
    assetType:     row.assetType,
    files:         row.files.map((f: any): MemoryFile => ({
      id:           f.id,
      fileUrl:      f.fileUrl,
      mimeType:     f.mimeType as MimeType,
      widthPx:      f.widthPx,
      heightPx:     f.heightPx,
      byteSize:     f.byteSize,
      displayOrder: f.displayOrder,
    })),
    textNote:      row.textNote,
    tags:          row.tags,
    isHighlight:   row.isHighlight,
    linkedHighlight: row.highlight
      ? { id: row.highlight.id, title: row.highlight.title }
      : null,
    capturedAt:    row.capturedAt.toISOString(),
    isEditable:    row.__isEditable, // 由调用方注入
    ...(row.deletedAt ? { deletedAt: row.deletedAt.toISOString() } : {}),
  };
}

// ---------- Helpers ----------

async function getUserTimezone(userId: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where:  { ...whereNotDeleted, id: userId },
    select: { timezone: true },
  });
  if (!user) throw Errors.notFound('User', userId);
  return user.timezone;
}

async function ensureChildOwned(childId: string, userId: string): Promise<void> {
  const child = await prisma.child.findFirst({
    where:  { ...whereNotDeleted, id: childId, userId },
    select: { id: true },
  });
  if (!child) throw Errors.notFound('Child', childId);
}

/**
 * Normalize tags: trim, drop empties, dedupe case-insensitively.
 * Preserves first-occurrence casing so "Playtime" + "playtime" → ["Playtime"].
 */
function normalizeTags(tagValues: string[] | undefined): string[] {
  if (!tagValues) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tagValues) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

async function upsertCustomTags(userId: string, tagValues: string[]): Promise<void> {
  // 把不在预设/library 里的写入 user_tag_library；不存在则插入，存在则跳过
  // 用 raw SQL 才能用 LOWER(TRIM(name)) unique 索引去重
  for (const tag of tagValues) {
    const normalized = tag.trim().toLowerCase();
    if (!normalized) continue;
    await prisma.$executeRaw`
      INSERT INTO user_tag_library (user_id, name)
      VALUES (${userId}::uuid, ${tag.trim()})
      ON CONFLICT DO NOTHING
    `;
    // 注：post-init.sql 已建 (user_id, LOWER(TRIM(name))) 唯一索引；冲突自动跳过
  }
}

// ---------- Routes ----------

export async function assetsRoutes(app: FastifyInstance) {
  // POST /assets — 创建 Memory（metadata 路径，文件已上传到 Supabase Storage）
  app.post('/', async (req, reply) => {
    const body = parseBody(memoryCreateSchema, req);

    // 业务校验：captured_at 不能是未来 5 分钟以上
    const capturedAt = new Date(body.capturedAt);
    if (capturedAt.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new ApiError(
        'INVALID_CAPTURED_AT_FUTURE',
        'capturedAt cannot be more than 5 minutes in the future',
        422,
      );
    }

    await ensureChildOwned(body.childId, req.userId);

    const hasFiles = (body.files?.length ?? 0) > 0;
    const hasText  = (body.textNote?.trim().length ?? 0) > 0;
    if (!hasFiles && !hasText) {
      throw new ApiError(
        'EMPTY_MEMORY',
        'Memory must have at least one photo or non-empty text',
        400,
      );
    }
    const assetType: 'photo' | 'text' | 'mixed' =
      hasFiles && hasText ? 'mixed' : hasFiles ? 'photo' : 'text';
    const normalizedTags = normalizeTags(body.tagValues);

    const memory = await prisma.$transaction(async (tx) => {
      const created = await tx.rawAsset.create({
        data: {
          childId:     body.childId,
          userId:      req.userId,
          assetType,
          textNote:    body.textNote ?? null,
          tags:        normalizedTags,
          isHighlight: false, // 必须走 POST /highlights 走配额校验
          capturedAt,
          files: body.files
            ? {
                create: body.files.map((f, i) => ({
                  fileUrl:      f.fileUrl,
                  storagePath:  f.storagePath,
                  mimeType:     f.mimeType,
                  widthPx:      f.widthPx ?? null,
                  heightPx:     f.heightPx ?? null,
                  byteSize:     f.byteSize,
                  displayOrder: f.displayOrder ?? i,
                })),
              }
            : undefined,
        },
        include: { files: { orderBy: { displayOrder: 'asc' } } },
      });

      if (normalizedTags.length > 0) {
        await upsertCustomTags(req.userId, normalizedTags);
      }

      return created;
    });

    const tz = await getUserTimezone(req.userId);
    reply.code(201);
    return {
      data: serializeMemory({
        ...memory,
        highlight: null,
        __isEditable: isCurrentMonth(memory.capturedAt, tz),
      }),
    };
  });

  // GET /assets — 列表（cursor 分页 + 月份过滤）
  app.get('/', async (req) => {
    const q = parseQuery(listQuery, req);
    await ensureChildOwned(q.childId, req.userId);

    const where: any = { ...whereNotDeleted, childId: q.childId };
    if (q.month) {
      const tz = await getUserTimezone(req.userId);
      // 客户端按 monthKey 查；服务端简化为 capturedAt 范围（粗筛）+ 应用层精确按 tz 算
      const [y, m] = q.month.split('-').map(Number);
      where.capturedAt = {
        gte: new Date(Date.UTC(y!, m! - 1, 1)),
        lt:  new Date(Date.UTC(y!, m!, 1)),
      };
      // 注：跨时区边界月可能漏 1-2 条，由 mobile 二次过滤；TODO 改成 generated column month_key
    }

    const items = await prisma.rawAsset.findMany({
      where,
      include: {
        files:     { orderBy: { displayOrder: 'asc' } },
        highlight: { select: { id: true, title: true } },
      },
      orderBy: { capturedAt: 'desc' },
      take:    q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    const hasMore   = items.length > q.limit;
    const trimmed   = hasMore ? items.slice(0, q.limit) : items;
    const tz        = await getUserTimezone(req.userId);

    return {
      data: trimmed.map(item => serializeMemory({
        ...item,
        __isEditable: isCurrentMonth(item.capturedAt, tz),
      })),
      pagination: {
        hasMore,
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
      },
    };
  });

  // GET /assets/trash — 软删列表
  app.get('/trash', async (req) => {
    const q = parseQuery(trashQuery, req);
    const where: any = {
      userId:    req.userId,
      deletedAt: { not: null },
    };
    if (q.childId) where.childId = q.childId;

    const items = await prisma.rawAsset.findMany({
      where,
      include: {
        files:     { orderBy: { displayOrder: 'asc' } },
        highlight: { select: { id: true, title: true } },
      },
      orderBy: { deletedAt: 'desc' },
      take:    q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > q.limit;
    const trimmed = hasMore ? items.slice(0, q.limit) : items;

    return {
      data: trimmed.map(item => serializeMemory({
        ...item,
        __isEditable: false,
      })),
      pagination: {
        hasMore,
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
      },
    };
  });

  // GET /assets/:id
  app.get('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const memory = await prisma.rawAsset.findFirst({
      where: { ...whereNotDeleted, id, userId: req.userId },
      include: {
        files:     { orderBy: { displayOrder: 'asc' } },
        highlight: { select: { id: true, title: true } },
      },
    });
    if (!memory) throw Errors.notFound('Memory', id);

    const tz = await getUserTimezone(req.userId);
    return {
      data: serializeMemory({
        ...memory,
        __isEditable: isCurrentMonth(memory.capturedAt, tz),
      }),
    };
  });

  // PATCH /assets/:id — R-08：仅当月可编辑
  app.patch('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const body   = parseBody(memoryPatchSchema, req);

    const existing = await prisma.rawAsset.findFirst({
      where: { ...whereNotDeleted, id, userId: req.userId },
      include: { files: { select: { id: true } } },
    });
    if (!existing) throw Errors.notFound('Memory', id);

    const tz = await getUserTimezone(req.userId);
    if (!isCurrentMonth(existing.capturedAt, tz)) {
      throw new ApiError(
        'MEMORY_EDIT_RESTRICTED',
        'Cannot edit memories from past months (R-08)',
        403,
      );
    }

    // mutex: addFiles 与 reorderFileIds 互斥
    if (body.addFiles && body.reorderFileIds) {
      throw Errors.validation('addFiles and reorderFileIds are mutually exclusive');
    }

    // EMPTY_MEMORY: 删到空（无 file + 空 text）
    const finalText  = body.textNote !== undefined ? body.textNote : existing.textNote;
    const finalCount = existing.files.length
      - (body.removeFileIds?.length ?? 0)
      + (body.addFiles?.length ?? 0);
    if ((finalText?.trim().length ?? 0) === 0 && finalCount <= 0) {
      throw new ApiError(
        'EMPTY_MEMORY',
        'Memory cannot be left empty (no photos and no text)',
        400,
      );
    }

    const normalizedPatchTags = body.tagValues !== undefined
      ? normalizeTags(body.tagValues)
      : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const data: any = {};
      if (body.textNote        !== undefined) data.textNote = body.textNote;
      if (normalizedPatchTags  !== undefined) data.tags     = normalizedPatchTags;

      if (Object.keys(data).length > 0) {
        await tx.rawAsset.update({ where: { id }, data });
      }

      // 移除文件
      if (body.removeFileIds && body.removeFileIds.length > 0) {
        await tx.assetFile.deleteMany({
          where: { assetId: id, id: { in: body.removeFileIds } },
        });
      }

      // 加文件
      if (body.addFiles && body.addFiles.length > 0) {
        const maxOrder = await tx.assetFile.aggregate({
          where: { assetId: id },
          _max:  { displayOrder: true },
        });
        const start = (maxOrder._max.displayOrder ?? -1) + 1;
        await tx.assetFile.createMany({
          data: body.addFiles.map((f, i) => ({
            assetId:      id,
            fileUrl:      f.fileUrl,
            storagePath:  f.storagePath,
            mimeType:     f.mimeType,
            widthPx:      f.widthPx ?? null,
            heightPx:     f.heightPx ?? null,
            byteSize:     f.byteSize,
            displayOrder: start + i,
          })),
        });
      }

      // 重排
      if (body.reorderFileIds) {
        for (let i = 0; i < body.reorderFileIds.length; i++) {
          await tx.assetFile.update({
            where: { id: body.reorderFileIds[i]! },
            data:  { displayOrder: i },
          });
        }
      }

      // 自定义 tags 入库
      if (normalizedPatchTags && normalizedPatchTags.length > 0) {
        for (const tag of normalizedPatchTags) {
          await tx.$executeRaw`
            INSERT INTO user_tag_library (user_id, name)
            VALUES (${req.userId}::uuid, ${tag})
            ON CONFLICT DO NOTHING
          `;
        }
      }

      return tx.rawAsset.findUniqueOrThrow({
        where: { id },
        include: {
          files:     { orderBy: { displayOrder: 'asc' } },
          highlight: { select: { id: true, title: true } },
        },
      });
    });

    return {
      data: serializeMemory({
        ...updated,
        __isEditable: true,
      }),
    };
  });

  // DELETE /assets/:id — 硬删；R-08 先于 force 检查，历史月份无论如何不可删
  app.delete('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const force  = (req.query as { hard?: string })?.hard === 'true';

    const existing = await prisma.rawAsset.findFirst({
      where:  { id, userId: req.userId },
      select: { id: true, capturedAt: true },
    });
    if (!existing) throw Errors.notFound('Memory', id);

    // R-08：历史月份禁止任何删除，无论 soft/hard
    const tz = await getUserTimezone(req.userId);
    if (!isCurrentMonth(existing.capturedAt, tz)) {
      throw new ApiError(
        'MEMORY_EDIT_RESTRICTED',
        'Cannot delete memories from past months (R-08)',
        403,
      );
    }

    if (!force) {
      await prisma.rawAsset.update({
        where: { id },
        data:  { deletedAt: new Date() },
      });
      return { data: { deletedAt: new Date().toISOString() } };
    }

    await prisma.rawAsset.delete({ where: { id } });
    return { data: { hardDeleted: true } };
  });

  // POST /assets/:id/restore — 恢复软删
  app.post('/:id/restore', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const existing = await prisma.rawAsset.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) throw Errors.notFound('Memory', id);
    if (!existing.deletedAt) throw Errors.validation('Memory is not soft-deleted');

    const tz = await getUserTimezone(req.userId);
    const restored = await prisma.rawAsset.update({
      where:   { id },
      data:    { deletedAt: null },
      include: {
        files:     { orderBy: { displayOrder: 'asc' } },
        highlight: { select: { id: true, title: true } },
      },
    });

    return {
      data: serializeMemory({
        ...restored,
        __isEditable: isCurrentMonth(restored.capturedAt, tz),
      }),
    };
  });
}
