import type { ApiErrorCode } from '@nestory/types';
import { config } from '@/shared/config';

/**
 * 客户端抛出的 API 错误（与后端 ApiError 镜像）。
 * 用于 catch 时按 code 分支处理（如 paywall 触发）。
 */
export class ApiClientError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ---------- Auth token ----------

/**
 * 获取 Bearer token。
 * 决策 4-6 之前还没接 Supabase Auth；dev 模式下走"dev-<userId>"约定。
 *
 * TODO: 接 Supabase Auth 后改为读真实 JWT。
 */
let _devUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'; // 占位 UUID

export function setDevUserId(id: string) {
  _devUserId = id;
}

async function getAuthToken(): Promise<string> {
  if (__DEV__) return `dev-${_devUserId}`;
  // TODO: prod — Supabase getSession().access_token
  throw new Error('Auth not yet wired for production');
}

// ---------- Core fetch ----------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
  skipAuth?: boolean; // 给 /shares/public/:token 用
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query, signal, skipAuth } = options;

  // 拼 query string
  let url = `${config.apiBaseUrl}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!skipAuth) {
    headers.Authorization = `Bearer ${await getAuthToken()}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // 204 No Content
  if (res.status === 204) return undefined as T;

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new ApiClientError('INTERNAL_ERROR', `Non-JSON response (${res.status})`, res.status);
  }

  if (!res.ok) {
    const err = (parsed as { error?: { code: ApiErrorCode; message: string; statusCode: number; details?: Record<string, unknown> } }).error;
    if (err) {
      throw new ApiClientError(err.code, err.message, err.statusCode, err.details);
    }
    throw new ApiClientError('INTERNAL_ERROR', `Request failed (${res.status})`, res.status);
  }

  // 成功响应统一带 { data, meta?, pagination? } 信封；返回整个对象，调用方按需取
  return parsed as T;
}
