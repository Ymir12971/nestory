import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { StoryShare, PublicShare, StoryDocument } from '@nestory/types';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';
import { parseBody, parseParams, uuidParam } from '../lib/validation';

// ---------- Schemas ----------

const shareCreateSchema = z.object({
  storyId: z.string().uuid(),
});

const tokenParam = z.object({
  token: z.string().min(43).max(64), // base64url(32 bytes) = 43 chars
});

// ---------- Helpers ----------

function generateToken(): string {
  // crypto.randomBytes(32).toString('base64url') = 43 字符 URL-safe，256 bit 熵
  return randomBytes(32).toString('base64url');
}

function buildShareUrl(token: string): string {
  // TODO: env-aware base URL
  const base = process.env.NESTORY_WEB_URL ?? 'https://nestory.app';
  return `${base}/share/${token}`;
}

// ---------- Routes ----------

export async function sharesRoutes(app: FastifyInstance) {
  // POST /shares — upsert：先查有效 token 复用，否则新建
  app.post('/', async (req, reply) => {
    const body = parseBody(shareCreateSchema, req);

    // 校验 story 归属（user_id 关联）
    const story = await prisma.story.findFirst({
      where: { id: body.storyId, userId: req.userId },
    });
    if (!story) throw Errors.notFound('Story', body.storyId);
    if (story.status !== 'generated' && story.status !== 'fallback_generated') {
      throw Errors.validation(`Story is not ready (status: ${story.status})`);
    }

    // 复用：找当前 story 的 active share
    const existing = await prisma.storyShare.findFirst({
      where: { storyId: body.storyId, revokedAt: null },
    });

    if (existing) {
      const doc = story.document as StoryDocument | null;
      const data: StoryShare = {
        id:        existing.id,
        storyId:   existing.storyId,
        token:     existing.token,
        shareUrl:  buildShareUrl(existing.token),
        og: {
          title:       doc?.shareMeta.ogTitle       ?? doc?.meta.title          ?? 'Nestory',
          description: doc?.shareMeta.ogDescription ?? '',
          imageUrl:    doc?.shareMeta.ogImageUrl    ?? doc?.meta.coverImageUrl  ?? '',
        },
        createdAt: existing.createdAt.toISOString(),
      };
      return { data };
    }

    // 新建
    const token   = generateToken();
    const created = await prisma.storyShare.create({
      data: { storyId: body.storyId, token },
    });
    const doc = story.document as StoryDocument | null;

    reply.code(201);
    const data: StoryShare = {
      id:        created.id,
      storyId:   created.storyId,
      token:     created.token,
      shareUrl:  buildShareUrl(created.token),
      og: {
        title:       doc?.shareMeta.ogTitle       ?? doc?.meta.title          ?? 'Nestory',
        description: doc?.shareMeta.ogDescription ?? '',
        imageUrl:    doc?.shareMeta.ogImageUrl    ?? doc?.meta.coverImageUrl  ?? '',
      },
      createdAt: created.createdAt.toISOString(),
    };
    return { data };
  });

  // GET /shares/public/:token — 公开访问，无需 auth（auth plugin 跳过 /shares/public）
  app.get('/public/:token', async (req): Promise<{ data: PublicShare }> => {
    const { token } = parseParams(tokenParam, req);

    const share = await prisma.storyShare.findFirst({
      where:   { token, revokedAt: null },
      include: { story: true },
    });
    if (!share) throw Errors.notFound('Share');

    const stored = share.story.document as StoryDocument | null;
    if (!stored) throw Errors.notFound('Story document');

    // 水印 = 生成时的状态 AND 作者现在不是 Premium（2026-10-29 用户定的 B 方案）：
    // Free 期间生成的 Story，作者订阅后分享链接就不带水印，退订后回来；
    // 付费期间生成的本来就是 false，永远不带。只改返回值，库里的 document 不动。
    let doc = stored;
    if (stored.watermark.enabled) {
      const sub = await prisma.subscription.findUnique({
        where:  { userId: share.story.userId },
        select: { subscriptionStatus: true },
      });
      const isPremium =
        sub?.subscriptionStatus === 'premium_active' ||
        sub?.subscriptionStatus === 'trial_active';
      if (isPremium) doc = { ...stored, watermark: { ...stored.watermark, enabled: false } } as StoryDocument;
    }

    const data: PublicShare = {
      storyId:  share.storyId,
      document: doc as unknown as Record<string, unknown>,
      og: {
        title:       doc.shareMeta.ogTitle       ?? doc.meta.title         ?? 'Nestory',
        description: doc.shareMeta.ogDescription ?? '',
        imageUrl:    doc.shareMeta.ogImageUrl    ?? doc.meta.coverImageUrl ?? '',
      },
    };
    return { data };
  });

  // DELETE /shares/:id — revoke（设 revoked_at）
  app.delete('/:id', async (req) => {
    const { id } = parseParams(uuidParam, req);

    const share = await prisma.storyShare.findFirst({
      where:   { id },
      include: { story: { select: { userId: true } } },
    });
    if (!share) throw Errors.notFound('Share', id);
    if (share.story.userId !== req.userId) throw Errors.notFound('Share', id); // 假装不存在防枚举

    if (share.revokedAt) {
      return { data: { revokedAt: share.revokedAt.toISOString() } };
    }

    const updated = await prisma.storyShare.update({
      where: { id },
      data:  { revokedAt: new Date() },
    });
    return { data: { revokedAt: updated.revokedAt!.toISOString() } };
  });
}
