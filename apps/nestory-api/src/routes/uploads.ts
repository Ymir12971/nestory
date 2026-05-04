import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { parseBody } from '../lib/validation';
import { ApiError } from '../lib/errors';
import { getSupabase, publicUrlFor, type StorageBucket } from '../lib/supabase';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/heif': 'heif',
};

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // R-07

const signSchema = z.object({
  bucket:   z.enum(['memories', 'avatars']),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/heif']),
  byteSize: z.number().int().positive().max(FILE_SIZE_LIMIT),
});

export async function uploadsRoutes(app: FastifyInstance) {
  // POST /uploads/sign — return a one-shot signed upload URL for direct browser/native PUT.
  // Path is namespaced under the requesting user, so cross-user writes are impossible
  // even if the URL leaks.
  app.post('/sign', async (req, reply) => {
    const body = parseBody(signSchema, req);
    const ext  = MIME_TO_EXT[body.mimeType];
    if (!ext) throw new ApiError('VALIDATION_ERROR', 'Unsupported mimeType', 400);

    const storagePath = `${req.userId}/${randomUUID()}.${ext}`;
    const bucket: StorageBucket = body.bucket;

    const { data, error } = await getSupabase()
      .storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      req.log.error({ err: error, bucket, storagePath }, 'createSignedUploadUrl failed');
      throw new ApiError('INTERNAL_ERROR', 'Failed to create upload URL', 500);
    }

    reply.code(201);
    return {
      data: {
        uploadUrl:   data.signedUrl,
        token:       data.token,
        storagePath: data.path,
        publicUrl:   publicUrlFor(bucket, data.path),
        mimeType:    body.mimeType,
        byteSize:    body.byteSize,
      },
    };
  });
}
