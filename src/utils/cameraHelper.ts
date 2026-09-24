import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { truncateString } from './memoryUtils';

/**
 * Aggressively compresses a captured photo for OCR on low-memory (2GB RAM) devices.
 * - Resizes to width 800px MAX (preserves aspect ratio)
 * - Compresses quality to 0.4 JPEG
 * - Returns ONLY the file URI (never keeps the bitmap in memory)
 *
 * @param photoUri Original file URI from CameraView.takePictureAsync
 * @returns Compressed file URI, safe to pass to OCR then discard
 */
export const compressForOCR = async (photoUri: string): Promise<string> => {
  let result: { uri: string } | undefined = undefined;
  try {
    result = await manipulateAsync(
      photoUri,
      [{ resize: { width: 800 } }],
      { compress: 0.4, format: SaveFormat.JPEG }
    );
    const compressedUri: string = result.uri;
    return compressedUri;
  } catch {
    // Fallback: return original URI if compression fails (low-memory safe:
    // caller must still null its own reference after OCR).
    // Truncate to avoid huge string retention upstream.
    return truncateString(photoUri, 1000);
  } finally {
    // Explicitly free local references — never keep the bitmap in memory.
    result = undefined;
    photoUri = null as unknown as string;
  }
};

/**
 * Captures + immediately compresses. Use this instead of calling
 * takePictureAsync directly with high quality.
 *
 * @param takePictureFn Callback that returns a raw photo URI (e.g. cameraRef.current.takePictureAsync)
 */
export const captureAndCompress = async (
  takePictureFn: () => Promise<{ uri?: string } | null>
): Promise<string | null> => {
  let raw: { uri?: string } | null = null;
  let uri: string | null = null;
  try {
    raw = await takePictureFn();
    if (!raw?.uri) return null;
    uri = await compressForOCR(raw.uri);
    return uri;
  } finally {
    // Free raw capture reference immediately
    raw = null;
    uri = null as unknown as string | null;
  }
};

/**
 * System camera with built-in crop UI (allowsEditing: true).
 * Returns ONLY the cropped file URI (compressed for OCR).
 */
export const takePhotoWithSystemCamera = async (): Promise<string | null> => {
  let result: ImagePicker.ImagePickerResult | null = null;
  try {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,  // <-- Disable cropping
      quality: 0.8,          // <-- Increase quality
      exif: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return await compressForOCR(result.assets[0].uri);
  } finally {
    result = null;
  }
};

/**
 * Gallery picker with built-in crop UI (allowsEditing: true).
 * Returns ONLY the cropped file URI (compressed for OCR).
 */
export const pickImageFromGallery = async (): Promise<string | null> => {
  let result: ImagePicker.ImagePickerResult | null = null;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      exif: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return await compressForOCR(result.assets[0].uri);
  } finally {
    result = null;
  }
};
