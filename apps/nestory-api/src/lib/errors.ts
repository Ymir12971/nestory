import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import type { ApiErrorCode } from '@nestory/types';
import { ZodError } from 'zod';

/**
 * 业务错误基类。Endpoint handler 抛此类，全局 handler 捕获后统一格式化。
 *
 * @example
 *   throw new ApiError('HIGHLIGHT_LIMIT_REACHED', 'Free plan limited to 10 highlights', 403);
 */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 常用快捷构造器
export const Errors = {
  unauthorized: (msg = 'Unauthorized') =>
    new ApiError('UNAUTHORIZED', msg, 401),
  notFound: (resource: string, id?: string) =>
    new ApiError('NOT_FOUND', id ? `${resource} ${id} not found` : `${resource} not found`, 404),
  validation: (msg: string, details?: Record<string, unknown>) =>
    new ApiError('VALIDATION_ERROR', msg, 400, details),
  internal: (msg = 'Internal server error') =>
    new ApiError('INTERNAL_ERROR', msg, 500),
};

/**
 * Fastify 全局 error handler — 把所有异常转成 ApiErrorEnvelope。
 * 注册：`app.setErrorHandler(errorHandler)`
 */
export async function errorHandler(
  err: FastifyError | ApiError | ZodError | Error,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  // 业务错误
  if (err instanceof ApiError) {
    req.log.info({ code: err.code, statusCode: err.statusCode }, err.message);
    return reply.status(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Zod 校验错误
  if (err instanceof ZodError) {
    req.log.info({ issues: err.issues }, 'Validation error');
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR' satisfies ApiErrorCode,
        message: err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
        statusCode: 400,
        details: { issues: err.issues },
      },
    });
  }

  // Fastify 内置错误（如 schema validation）
  if ('statusCode' in err && typeof err.statusCode === 'number' && err.statusCode < 500) {
    req.log.info(err);
    return reply.status(err.statusCode).send({
      error: {
        code: 'VALIDATION_ERROR' satisfies ApiErrorCode,
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }

  // 未知错误 → 500，不泄漏内部 message
  req.log.error(err);
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR' satisfies ApiErrorCode,
      message: 'Internal server error',
      statusCode: 500,
    },
  });
}
