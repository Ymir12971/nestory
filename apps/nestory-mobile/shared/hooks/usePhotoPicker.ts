import * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto {
  uri: string;
  width: number;
  height: number;
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
    return result.assets.map(a => ({ uri: a.uri, width: a.width, height: a.height }));
  };

  return launch;
}
