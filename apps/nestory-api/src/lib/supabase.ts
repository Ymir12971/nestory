import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set to use Supabase Storage');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export type StorageBucket = 'memories' | 'avatars';

const BUCKET_CONFIG: Record<StorageBucket, { public: boolean }> = {
  memories: { public: true },
  avatars:  { public: true },
};

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/heif'];
const FILE_SIZE_LIMIT = 10 * 1024 * 1024;

/**
 * Idempotently create the storage buckets we depend on. Safe to call on every
 * server boot — re-creating an existing bucket returns a 4xx that we swallow.
 */
export async function ensureBuckets(log: (msg: string) => void): Promise<void> {
  const sb = getSupabase();
  for (const [name, cfg] of Object.entries(BUCKET_CONFIG) as [StorageBucket, { public: boolean }][]) {
    const { data, error } = await sb.storage.createBucket(name, {
      public:           cfg.public,
      fileSizeLimit:    FILE_SIZE_LIMIT,
      allowedMimeTypes: ALLOWED_MIMES,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        log(`bucket ${name} ok (exists)`);
        continue;
      }
      throw new Error(`Failed to ensure bucket ${name}: ${error.message}`);
    }
    log(`bucket ${name} created (${data?.name ?? name})`);
  }
}

export function publicUrlFor(bucket: StorageBucket, path: string): string {
  return getSupabase().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
