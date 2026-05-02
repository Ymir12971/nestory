import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// 开发环境复用 client 避免 hot-reload 创建多个连接
export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * 软删 filter — 显式合并到 query where 子句。
 * 决策 5：避免全局 middleware 隐式注入风险，用显式合并。
 *
 * @example
 *   prisma.rawAsset.findMany({ where: { ...whereNotDeleted, childId } });
 *
 * 查 trash 不要用此 helper：
 *   prisma.rawAsset.findMany({ where: { deletedAt: { not: null } } });
 */
export const whereNotDeleted = { deletedAt: null } as const;
