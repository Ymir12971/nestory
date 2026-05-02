import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Child, ChildCreate, ChildPatch } from '@nestory/types';
import { apiFetch } from './client';
import { queryKeys } from './queryClient';

// ---------- Functions ----------

export async function listChildren(): Promise<Child[]> {
  const res = await apiFetch<{ data: Child[] }>('/children');
  return res.data;
}

export async function getChild(id: string): Promise<Child> {
  const res = await apiFetch<{ data: Child }>(`/children/${id}`);
  return res.data;
}

export async function createChild(body: ChildCreate): Promise<Child> {
  const res = await apiFetch<{ data: Child }>('/children', { method: 'POST', body });
  return res.data;
}

export async function updateChild(id: string, body: ChildPatch): Promise<Child> {
  const res = await apiFetch<{ data: Child }>(`/children/${id}`, { method: 'PATCH', body });
  return res.data;
}

export async function deleteChild(id: string, hard = false): Promise<void> {
  await apiFetch(`/children/${id}`, {
    method: 'DELETE',
    query: hard ? { hard: 'true' } : undefined,
  });
}

export async function restoreChild(id: string): Promise<Child> {
  const res = await apiFetch<{ data: Child }>(`/children/${id}/restore`, { method: 'POST' });
  return res.data;
}

export async function setActiveChild(childId: string): Promise<{ activeChildId: string }> {
  const res = await apiFetch<{ data: { activeChildId: string } }>('/children/active', {
    method: 'PATCH',
    body:   { childId },
  });
  return res.data;
}

// ---------- Hooks ----------

export function useChildren() {
  return useQuery({ queryKey: queryKeys.children, queryFn: listChildren });
}

export function useChild(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.child(id) : ['child', 'null'],
    queryFn:  () => getChild(id!),
    enabled:  !!id,
  });
}

export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createChild,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.children }),
  });
}

export function useUpdateChild(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChildPatch) => updateChild(id, body),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.child(id), data);
      qc.invalidateQueries({ queryKey: queryKeys.children });
    },
  });
}

export function useDeleteChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => deleteChild(id, hard),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.children }),
  });
}

export function useSetActiveChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setActiveChild,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.children });
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
    },
  });
}
