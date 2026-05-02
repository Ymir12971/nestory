import { useMutation } from '@tanstack/react-query';
import type { StoryShare, ShareCreate } from '@nestory/types';
import { apiFetch } from './client';

export async function createShare(body: ShareCreate): Promise<StoryShare> {
  const res = await apiFetch<{ data: StoryShare }>('/shares', { method: 'POST', body });
  return res.data;
}

export async function revokeShare(id: string): Promise<{ revokedAt: string }> {
  const res = await apiFetch<{ data: { revokedAt: string } }>(`/shares/${id}`, {
    method: 'DELETE',
  });
  return res.data;
}

export function useCreateShare() {
  return useMutation({ mutationFn: createShare });
}

export function useRevokeShare() {
  return useMutation({ mutationFn: revokeShare });
}
