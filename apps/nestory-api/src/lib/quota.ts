import { Prisma } from '@prisma/client';
import { prisma, whereNotDeleted } from './prisma';
import { ApiError } from './errors';

const HIGHLIGHT_LIMIT_FREE = 10;

/**
 * R-04 Highlight 配额检查 + 写入（事务 + advisory lock）
 *
 * 在 9/10 边界并发 Save 时，纯 COUNT 预检会两个请求都通过，必须用 advisory_xact_lock 串行化。
 *
 * @returns 新创建的 Highlight id（事务内）
 * @throws HIGHLIGHT_LIMIT_REACHED (403) — Free 用户已达 10 个
 */
export async function createHighlightWithQuota(args: {
  userId: string;
  childId: string;
  assetId: string;
  coverFileId?: string | null;
  isPremium: boolean;  // 由调用方根据 subscriptionStatus 判断
}): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // advisory lock — 同一 user 串行
    // hashtext('highlight_count:' || user_id) 转为 bigint
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`highlight_count:${args.userId}`}))`;

    if (!args.isPremium) {
      const count = await tx.highlight.count({
        where: { ...whereNotDeleted, userId: args.userId },
      });
      if (count >= HIGHLIGHT_LIMIT_FREE) {
        throw new ApiError(
          'HIGHLIGHT_LIMIT_REACHED',
          `Free plan allows up to ${HIGHLIGHT_LIMIT_FREE} highlights`,
          403,
          { count, limit: HIGHLIGHT_LIMIT_FREE },
        );
      }
    }

    const highlight = await tx.highlight.create({
      data: {
        userId:      args.userId,
        childId:     args.childId,
        assetId:     args.assetId,
        coverFileId: args.coverFileId ?? null,
      },
    });

    // 同步 raw_assets.is_highlight = true
    await tx.rawAsset.update({
      where: { id: args.assetId },
      data:  { isHighlight: true },
    });

    return highlight.id;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
