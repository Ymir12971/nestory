import type { FastifyRequest } from 'fastify';
import { z, type ZodSchema } from 'zod';

/**
 * 解析 request body 用 zod schema，失败抛 ZodError（被 errorHandler 捕获）。
 *
 * @example
 *   const schema = z.object({ childId: z.string().uuid(), capturedAt: z.string().datetime() });
 *   const body = parseBody(schema, req);
 */
export function parseBody<T extends ZodSchema>(
  schema: T,
  req: FastifyRequest,
): z.infer<T> {
  return schema.parse(req.body);
}

export function parseQuery<T extends ZodSchema>(
  schema: T,
  req: FastifyRequest,
): z.infer<T> {
  return schema.parse(req.query);
}

export function parseParams<T extends ZodSchema>(
  schema: T,
  req: FastifyRequest,
): z.infer<T> {
  return schema.parse(req.params);
}

// 常用 schema 片段
export const uuidParam = z.object({ id: z.string().uuid() });
export const cursorPagination = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
