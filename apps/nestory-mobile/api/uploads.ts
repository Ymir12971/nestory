import { apiFetch } from './client';
import type { PickedPhoto, PickedMime } from '@/shared/hooks/usePhotoPicker';

export type UploadBucket = 'memories' | 'avatars';

export interface SignedUpload {
  uploadUrl:   string;
  token:       string;
  storagePath: string;
  publicUrl:   string;
  mimeType:    PickedMime;
  byteSize:    number;
}

async function signUpload(args: {
  bucket:   UploadBucket;
  mimeType: PickedMime;
  byteSize: number;
}): Promise<SignedUpload> {
  const res = await apiFetch<{ data: SignedUpload }>('/uploads/sign', {
    method: 'POST',
    body:   args,
  });
  return res.data;
}

/**
 * Picks up a photo (already chosen via usePhotoPicker), reads the bytes,
 * asks the API for a signed URL, and PUTs the bytes directly to Supabase Storage.
 *
 * Returns the metadata the caller will pass to POST /assets or PATCH /children.
 */
export async function uploadPhoto(
  photo: PickedPhoto,
  bucket: UploadBucket,
): Promise<{
  fileUrl:     string;
  storagePath: string;
  mimeType:    PickedMime;
  widthPx:     number;
  heightPx:    number;
  byteSize:    number;
}> {
  const blob = await fetchAsBlob(photo.uri);
  const byteSize = photo.byteSize ?? blob.size;

  const signed = await signUpload({
    bucket,
    mimeType: photo.mimeType,
    byteSize,
  });

  const putRes = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': photo.mimeType,
      'x-upsert':     'false',
    },
    body: blob,
  });

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => '');
    throw new Error(`Photo upload failed (${putRes.status}): ${detail.slice(0, 200)}`);
  }

  return {
    fileUrl:     signed.publicUrl,
    storagePath: signed.storagePath,
    mimeType:    photo.mimeType,
    widthPx:     photo.width,
    heightPx:    photo.height,
    byteSize,
  };
}

async function fetchAsBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Failed to read photo (${res.status})`);
  return res.blob();
}
