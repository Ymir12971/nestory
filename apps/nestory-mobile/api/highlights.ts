import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Highlight, HighlightCreate, HighlightMeta, PaginatedResponse } from '@nestory/types';
import { apiFetch } from './client';
import { queryKeys } from './queryClient';

export interface HighlightPatchInput {
  title?:       string | null;
  coverFileId?: string;
}

// ---------- Functions ----------

export async function listHighlights(args: {
  childId?: string;
  cursor?:  string;
  limit?:   number;
} = {}): Promise<PaginatedResponse<Highlight>> {
  return apiFetch<PaginatedResponse<Highlight>>('/highlights', { query: args });
}

export async function getHighlight(id: string): Promise<Highlight> {
  const res = await apiFetch<{ data: Highlight }>(`/highlights/${id}`);
  return res.data;
}

export async function createHighlight(
  body: HighlightCreate,
): Promise<{ highlight: Highlight; meta: HighlightMeta }> {
  const res = await apiFetch<{ data: Highlight; meta: HighlightMeta }>('/highlights', {
    method: 'POST',
    body,
  });
  return { highlight: res.data, meta: res.meta };
}

export async function updateHighlight(id: string, body: HighlightPatchInput): Promise<Highlight> {
  const res = await apiFetch<{ data: Highlight }>(`/highlights/${id}`, { method: 'PATCH', body });
  return res.data;
}

export async function deleteHighlight(id: string): Promise<void> {
  await apiFetch(`/highlights/${id}`, { method: 'DELETE' });
}

// ---------- Hooks ----------

export function useHighlights(args: { childId?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.highlights(args.childId),
    queryFn:  () => listHighlights(args),
  });
}

export function useHighlight(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.highlight(id) : ['highlight', 'null'],
    queryFn:  () => getHighlight(id!),
    enabled:  !!id,
  });
}

export function useCreateHighlight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createHighlight,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['highlights'] });
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useUpdateHighlight(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: HighlightPatchInput) => updateHighlight(id, body),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.highlight(id), data);
      qc.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}

export function useDeleteHighlight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteHighlight,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['highlights'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
    },
  });
}
