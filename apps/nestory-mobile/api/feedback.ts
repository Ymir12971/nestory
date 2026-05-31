import { useMutation } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface FeedbackBody {
  text:   string;
  email?: string;
}

export async function submitFeedback(body: FeedbackBody): Promise<{ received: true }> {
  const res = await apiFetch<{ data: { received: true } }>('/feedback', {
    method: 'POST',
    body,
  });
  return res.data;
}

export function useSubmitFeedback() {
  return useMutation({ mutationFn: submitFeedback });
}
