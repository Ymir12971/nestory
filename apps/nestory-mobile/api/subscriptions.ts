import { useQuery } from '@tanstack/react-query';
import type { Subscription } from '@nestory/types';
import { apiFetch } from './client';
import { queryKeys } from './queryClient';

export async function getMySubscription(): Promise<Subscription> {
  const res = await apiFetch<{ data: Subscription }>('/subscriptions/me');
  return res.data;
}

export function useSubscription() {
  return useQuery({ queryKey: queryKeys.subscription, queryFn: getMySubscription });
}
