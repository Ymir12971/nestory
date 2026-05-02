import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Highlight, HighlightAsset } from '@nestory/types';
import { prisma, whereNotDeleted } from '../lib/prisma';
import { Errors } from '../lib/errors';
import { parseBody, parseParams, parseQuery, uuidParam, cursorPagination } from '../lib/validation';
import { createHighlightWithQuota } from '../lib/quota';

// ---------- Schemas ----------

const highlightCreateSchema = z.object({
  assetId:     z.string().uuid(),
  childId:     z.string().uuid(),
  coverFileId: z.string().uuid().optional(),
});

const highlightPatchSchema = z.object({
  title:       z.string().max(100).nullable().optional(),
  coverFileId: z.string().uuid().optional(),
});

const listQuery = cursorPagination.extend({
  childId: z.string().uuid().optional(),
});

// ---------- Helpers ----------

function deriveCoverOrientation(width: number | null, height: number | null): 'portrait' | 'landscape' {
  if (width == null || height == null) return 'portrait'; // 默认纵向
  return width > height ? 'landscape' : 'portrait';
}

async function isPremium(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where:  { userId },
    select: { subscriptionStatus: true },
  });
  return sub?.subscriptionStatus === 'premium_active' || sub?.subscriptionStatus === 'trial_active';
}

function serializeHighlight(row: any): Highlight {
  // 找 cover file
  const coverFile = row.coverFileId
    ? row.rawAsset.files.find((f: any) => f.id === row.coverFileId)
    : row.rawAsset.files[0]; // fallback 取第一张

  const asset: HighlightAsset = {
    fileUrls:   row.rawAsset.files.map((f: any) => f.fileUrl),
    textNote:   row.rawAsset.textNote,
    tags:       row.rawAsset.tags,
    capturedAt: row.rawAsset.capturedAt.toISOString(),
  };

  return {
    id:               row.id,
    assetId:          row.assetId,
    coverFileId:      row.coverFileId,
    coverOrientation: deriveCoverOrientation(coverFile?.widthPx ?? null, coverFile?.heightPx ?? null),
    title:            row.title,
    cardType:         row.cardType ?? 'default',
    renderedImageUrl: row.renderedImageUrl,
    asset,
    createdAt:        row.createdAt.toISOString(),
  };
}

// ---------- Routes ----------

export async function highlightsRoutes(app: FastifyInstance) {
  // POST /highlights — 标记 memory 为 highlight；R-04 配额检查
  app.post('/', async (req, reply) => {
    const body = parseBody(highlightCreateSchema, req);

    // 校验 asset 归属 + 未软删 + 与 childId 一致
    const asset = await prisma.rawAsset.findFirst({
      where:  { ...whereNotDeleted, id: body.assetId, userId: req.userId, childId: body.childId },
      include: { files: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!asset) throw Errors.notFound('Memory', body.assetId);

    // 多张照片必须传 coverFileId，单张可省
    let coverFileId = body.coverFileId ?? null;
    if (asset.files.length > 1 && !coverFileId) {
      throw Errors.validation('coverFileId is required when memory has multiple photos');
    }
    if (coverFileId && !asset.files.some(f => f.id === coverFileId)) {
      throw Errors.validation('coverFileId does not belong to this asset');
    }
    if (!coverFileId && asset.files.length === 1) {
      coverFileId = asset.files[0]!.id;
    }

    const premium = await isPremium(req.userId);

    const highlightId = await createHighlightWithQuota({
      userId:      req.userId,
      childId:     body.childId,
      assetId:     body.assetId,
      coverFileId,
      isPremium:   premium,
    });

    const highlight = await prisma.highlight.findUniqueOrThrow({
      where:   { id: highlightId },
      include: { rawAsset: { include: { files: { orderBy: { displayOrder: 'asc' } } } } },
    });

    reply.code(201);
    return { data: serializeHighlight(highlight) };
  });

  // GET /highlights — 列表（cursor 分页 + 可选 childId 过滤）
  app.get('/', async (req) => {
    const q = parseQuery(listQuery, req);

    const where: any = { ...whereNotDeleted, userId: req.userId };
    if (q.childId) where.childId = q.childId;

    const items = await prisma.highlight.findMany({
      where,
      include: { rawAsset: { include: { files: { orderBy: { displayOrder: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
      take:    q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > q.limit;
    const trimmed = hasMore ? items.slice(0, q.limit) : items;

    return {
      data: trimmed.map(serializeHighlight),
      pagination: {
        hasMore,
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
      },
    };
  });

  // GET /highlights/:id
  app.get('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const item = await prisma.highlight.findFirst({
      where:   { ...whereNotDeleted, id, userId: req.userId },
      include: { rawAsset: { include: { files: { orderBy: { displayOrder: 'asc' } } } } },
    });
    if (!item) throw Errors.notFound('Highlight', id);
    return { data: serializeHighlight(item) };
  });

  // PATCH /highlights/:id — 改 title / coverFileId
  app.patch('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);
    const body   = parseBody(highlightPatchSchema, req);

    const existing = await prisma.highlight.findFirst({
      where: { ...whereNotDeleted, id, userId: req.userId },
      include: { rawAsset: { include: { files: { select: { id: true } } } } },
    });
    if (!existing) throw Errors.notFound('Highlight', id);

    if (body.coverFileId && !existing.rawAsset.files.some(f => f.id === body.coverFileId)) {
      throw Errors.validation('coverFileId does not belong to this asset');
    }

    const updated = await prisma.highlight.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.coverFileId !== undefined ? { coverFileId: body.coverFileId } : {}),
      },
      include: { rawAsset: { include: { files: { orderBy: { displayOrder: 'asc' } } } } },
    });
    return { data: serializeHighlight(updated) };
  });

  // DELETE /highlights/:id — 软删（取消 highlight 标记，memory 不删除）
  app.delete('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);

    const existing = await prisma.highlight.findFirst({
      where:  { id, userId: req.userId },
      select: { id: true, assetId: true },
    });
    if (!existing) throw Errors.notFound('Highlight', id);

    await prisma.$transaction([
      prisma.highlight.update({
        where: { id },
        data:  { deletedAt: new Date() },
      }),
      prisma.rawAsset.update({
        where: { id: existing.assetId },
        data:  { isHighlight: false },
      }),
    ]);

    return { data: { deletedAt: new Date().toISOString() } };
  });
}
