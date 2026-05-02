import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Memory, PaginatedResponse, MimeType } from '@nestory/types';
import { apiFetch } from './client';
import { queryKeys } from './queryClient';

// ---------- Types (input shapes; align with API server schemas) ----------

export interface AssetFileInput {
  fileUrl:       string;
  storagePath:   string;
  mimeType:      MimeType;
  widthPx?:      number;
  heightPx?:     number;
  byteSize:      number;
  displayOrder?: number;
}

export interface MemoryCreateInput {
  childId:     string;
  capturedAt:  string;          // ISO 8601
  textNote?:   string;
  tagValues?:  string[];
  isHighlight?: boolean;         // 注：当前 API 忽略此字段，is_highlight 必须走 POST /highlights
  files?:      AssetFileInput[];
}

export interface MemoryPatchInput {
  textNote?:       string;
  tagValues?:      string[];
  addFiles?:       AssetFileInput[];
  removeFileIds?:  string[];
  reorderFileIds?: string[];
}

// ---------- Functions ----------

export async function listAssets(args: {
  childId: string;
  month?:  string;
  cursor?: string;
  limit?:  number;
}): Promise<PaginatedResponse<Memory>> {
  return apiFetch<PaginatedResponse<Memory>>('/assets', {
    query: {
      childId: args.childId,
      month:   args.month,
      cursor:  args.cursor,
      limit:   args.limit,
    },
  });
}

export async function listAssetsTrash(args: {
  childId?: string;
  cursor?:  string;
  limit?:   number;
}): Promise<PaginatedResponse<Memory>> {
  return apiFetch<PaginatedResponse<Memory>>('/assets/trash', { query: args });
}

export async function getAsset(id: string): Promise<Memory> {
  const res = await apiFetch<{ data: Memory }>(`/assets/${id}`);
  return res.data;
}

export async function createAsset(body: MemoryCreateInput): Promise<Memory> {
  const res = await apiFetch<{ data: Memory }>('/assets', { method: 'POST', body });
  return res.data;
}

export async function updateAsset(id: string, body: MemoryPatchInput): Promise<Memory> {
  const res = await apiFetch<{ data: Memory }>(`/assets/${id}`, { method: 'PATCH', body });
  return res.data;
}

export async function deleteAsset(id: string, hard = true): Promise<void> {
  await apiFetch(`/assets/${id}`, {
    method: 'DELETE',
    query:  hard ? { hard: 'true' } : undefined,
  });
}

export async function restoreAsset(id: string): Promise<Memory> {
  const res = await apiFetch<{ data: Memory }>(`/assets/${id}/restore`, { method: 'POST' });
  return res.data;
}

// ---------- Hooks ----------

export function useAssets(args: { childId: string; month?: string }) {
  return useQuery({
    queryKey: queryKeys.assets(args.childId, args.month),
    queryFn:  () => listAssets(args),
    enabled:  !!args.childId,
  });
}

export function useAsset(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.asset(id) : ['asset', 'null'],
    queryFn:  () => getAsset(id!),
    enabled:  !!id,
  });
}

export function useAssetsTrash(args: { childId?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.assetsTrash(args.childId),
    queryFn:  () => listAssetsTrash(args),
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAsset,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assets(vars.childId) });
      qc.invalidateQueries({ queryKey: queryKeys.subscription }); // story_quota / hl count 可能变
    },
  });
}

export function useUpdateAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MemoryPatchInput) => updateAsset(id, body),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.asset(id), data);
      qc.invalidateQueries({ queryKey: ['assets'] }); // 任意 list 都失效
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => deleteAsset(id, hard),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}

export function useRestoreAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: restoreAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}
