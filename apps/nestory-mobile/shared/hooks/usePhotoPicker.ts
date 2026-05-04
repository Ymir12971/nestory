import * as ImagePicker from 'expo-image-picker';

export type PickedMime = 'image/jpeg' | 'image/png' | 'image/heif';

export interface PickedPhoto {
  uri:       string;
  width:     number;
  height:    number;
  mimeType:  PickedMime;
  byteSize?: number;        // sometimes unavailable on iOS — uploader will fall back to blob.size
}

function normalizeMime(raw: string | null | undefined, uri: string): PickedMime {
  const mime = (raw ?? '').toLowerCase();
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/heif') return mime;
  // Fall back to URI extension when picker doesn't supply mimeType (iOS native sometimes).
  const ext = uri.split('?')[0]!.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'png')                     return 'image/png';
  if (ext === 'heic' || ext === 'heif')  return 'image/heif';
  return 'image/jpeg'; // picker re-encodes to JPEG at quality 0.85 by default
}

/**
 * Returns a launcher function that requests media-library permission then opens
 * the image picker. Single-photo mode by default; pass `multiple: true` for
 * multi-select (used in H-02 / H-04 photo strips).
 */
export function usePhotoPicker(options?: { multiple?: boolean }) {
  const multiple = options?.multiple ?? false;

  const launch = async (): Promise<PickedPhoto[]> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return [];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: multiple,
      allowsEditing: !multiple,
      quality: 0.85,
    });

    if (result.canceled) return [];
    return result.assets.map(a => ({
      uri:      a.uri,
      width:    a.width,
      height:   a.height,
      mimeType: normalizeMime(a.mimeType, a.uri),
      byteSize: a.fileSize,
    }));
  };

  return launch;
}
