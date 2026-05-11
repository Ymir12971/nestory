import type { StoryDocument, StoryDetail, PublicShare } from '@nestory/types';

/**
 * Server-side API client for nestory-web pages.
 *
 * The story pages are server components — they fetch the API on the request
 * hot path with no client-side JS needed. `cache: 'no-store'` opts out of
 * Next's data cache so a freshly-generated story shows up immediately.
 *
 * Auth model:
 *   - /share/[token]   → public, no auth (hits /shares/public/:token)
 *   - /story/[id]?t=…  → authenticated; the mobile WebView injects the user's
 *     access token via the `?t=` query string. We never log this URL so the
 *     token doesn't end up in disk logs.
 */

function apiBaseUrl(): string {
  return process.env.API_URL?.replace(/\/$/, '') || 'http://localhost:3001';
}

interface ApiEnvelope<T> { data: T }

export class ApiFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiFetchError';
  }
}

async function getEnvelope<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) {
    throw new ApiFetchError(res.status, `${res.status} ${res.statusText} for ${path}`);
  }
  const body = (await res.json()) as ApiEnvelope<T>;
  return body.data;
}

export async function fetchPublicShare(token: string): Promise<PublicShare> {
  return getEnvelope<PublicShare>(`/shares/public/${encodeURIComponent(token)}`);
}

export async function fetchStory(id: string, accessToken: string): Promise<StoryDetail> {
  return getEnvelope<StoryDetail>(`/stories/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Helper for converting the PublicShare's untyped `document` payload into the
// strongly-typed StoryDocument. We trust the server's shape rather than
// duplicating runtime validation here — schema drift would surface as a
// rendering error which we'd catch in dev.
export function asStoryDocument(doc: unknown): StoryDocument {
  return doc as StoryDocument;
}
