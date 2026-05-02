import { useQuery } from '@tanstack/react-query';
import type {
  CurrentMonthStatus,
  StoryListItem,
  StoryDetail,
  StoryStatusPoll,
} from '@nestory/types';
import { apiFetch } from './client';
import { queryKeys } from './queryClient';

interface StoriesResponse {
  data: { currentMonth: CurrentMonthStatus; historical: StoryListItem[] };
}

// ---------- Functions ----------

export async function listStories(args: { childId: string; year?: number }) {
  const res = await apiFetch<StoriesResponse>('/stories', { query: args });
  return res.data;
}

export async function getStory(id: string): Promise<StoryDetail> {
  const res = await apiFetch<{ data: StoryDetail }>(`/stories/${id}`);
  return res.data;
}

export async function getStoryStatus(id: string): Promise<StoryStatusPoll> {
  const res = await apiFetch<{ data: StoryStatusPoll }>(`/stories/${id}/status`);
  return res.data;
}

// ---------- Hooks ----------

export function useStories(args: { childId: string; year?: number }) {
  return useQuery({
    queryKey: queryKeys.stories(args.childId, args.year),
    queryFn:  () => listStories(args),
    enabled:  !!args.childId,
  });
}

export function useStory(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.story(id) : ['story', 'null'],
    queryFn:  () => getStory(id!),
    enabled:  !!id,
  });
}

export function useStoryStatus(id: string | null, opts?: { refetchIntervalMs?: number }) {
  return useQuery({
    queryKey:        id ? queryKeys.storyStatus(id) : ['story', 'null', 'status'],
    queryFn:         () => getStoryStatus(id!),
    enabled:         !!id,
    refetchInterval: opts?.refetchIntervalMs ?? 5000,
  });
}
