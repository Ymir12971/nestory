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

// 注:bucket 名保留 'memories' —— 产品术语 2026-07 改叫 Moment,但桶名写在
// 所有已存照片的 URL 里,改名要迁移全部对象存储,对用户零收益。
export type StorageBucket = 'memories' | 'avatars' | 'stories';

const BUCKET_CONFIG: Record<StorageBucket, { public: boolean }> = {
  memories: { public: true },
  avatars:  { public: true },
  // Story 渲染用的预裁切/多尺寸变体(§7.2 阶段二)。Story 不可变,可长缓存。
  stories:  { public: true },
};

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/heif', 'image/webp'];
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

/**
 * Deletes objects from a bucket, chunked — Storage takes a path array and we
 * don't want an unbounded request. Throws on the first failing chunk; callers
 * that must not fail the surrounding request should catch and log.
 *
 * Deleting a database row never removes its file: without a call to this, the
 * object outlives the record and keeps costing storage.
 */
export async function removeStorageObjects(bucket: StorageBucket, paths: string[]): Promise<number> {
  const CHUNK = 100;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const { error } = await getSupabase().storage.from(bucket).remove(paths.slice(i, i + CHUNK));
    if (error) throw new Error(`remove from ${bucket} failed: ${error.message}`);
  }
  return paths.length;
}
