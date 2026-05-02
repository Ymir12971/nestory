import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // mobile 网络抖动多，给 1 次重试，但 4xx 不重试
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.statusCode < 500) return false;
        return failureCount < 1;
      },
      staleTime: 30 * 1000, // 30s 内复用 cache
      refetchOnWindowFocus: false, // mobile 没有 window focus 概念
    },
    mutations: {
      retry: false,
    },
  },
});

// 跨模块 invalidate 的统一 key namespace
export const queryKeys = {
  user:           ['user', 'me'] as const,
  subscription:   ['subscription', 'me'] as const,
  children:       ['children'] as const,
  child:          (id: string) => ['child', id] as const,
  assets:         (childId: string, month?: string) => ['assets', childId, month ?? null] as const,
  asset:          (id: string) => ['asset', id] as const,
  assetsTrash:    (childId?: string) => ['assets', 'trash', childId ?? null] as const,
  highlights:     (childId?: string) => ['highlights', childId ?? null] as const,
  highlight:      (id: string) => ['highlight', id] as const,
  stories:        (childId: string, year?: number) => ['stories', childId, year ?? null] as const,
  story:          (id: string) => ['story', id] as const,
  storyStatus:    (id: string) => ['story', id, 'status'] as const,
  presetTags:     ['tags', 'presets'] as const,
  userTags:       ['tags', 'user'] as const,
};
