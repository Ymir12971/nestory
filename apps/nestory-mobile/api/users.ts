import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, UserPatch } from '@nestory/types';
import { apiFetch } from './client';
import { queryKeys } from './queryClient';

// ---------- Functions ----------

export async function getMe(): Promise<User> {
  const res = await apiFetch<{ data: User }>('/users/me');
  return res.data;
}

export async function updateMe(body: UserPatch): Promise<User> {
  const res = await apiFetch<{ data: User }>('/users/me', { method: 'PATCH', body });
  return res.data;
}

export async function deleteMe(): Promise<{ deletedAt: string }> {
  const res = await apiFetch<{ data: { deletedAt: string } }>('/users/me', { method: 'DELETE' });
  return res.data;
}

// ---------- Hooks ----------

export function useMe() {
  return useQuery({ queryKey: queryKeys.user, queryFn: getMe });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (data) => qc.setQueryData(queryKeys.user, data),
  });
}

export function useDeleteMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMe,
    onSuccess: () => qc.clear(), // 注销后清所有 cache
  });
}
