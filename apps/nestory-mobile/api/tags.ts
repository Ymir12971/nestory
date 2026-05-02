import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { queryKeys } from './queryClient';

export interface UserTag {
  name: string;
  createdAt: string;
}

// ---------- Functions ----------

export async function getPresetTags(): Promise<readonly string[]> {
  const res = await apiFetch<{ data: readonly string[] }>('/tags');
  return res.data;
}

export async function getUserTags(): Promise<UserTag[]> {
  const res = await apiFetch<{ data: UserTag[] }>('/tags/user');
  return res.data;
}

export async function deleteUserTag(name: string): Promise<void> {
  await apiFetch(`/tags/user/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

// ---------- Hooks ----------

export function usePresetTags() {
  return useQuery({
    queryKey:  queryKeys.presetTags,
    queryFn:   getPresetTags,
    staleTime: Infinity, // 静态配置，不变
  });
}

export function useUserTags() {
  return useQuery({ queryKey: queryKeys.userTags, queryFn: getUserTags });
}

export function useDeleteUserTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUserTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.userTags }),
  });
}
