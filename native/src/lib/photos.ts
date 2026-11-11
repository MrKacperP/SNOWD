import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

async function choose(source: "camera" | "library") {
  const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error(source === "camera" ? "Allow camera access in Settings to take a photo." : "Allow photo access in Settings to choose a photo.");
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0] || null;
}

const fit = (asset: ImagePicker.ImagePickerAsset, edge: number) => {
  const { width = edge, height = edge } = asset;
  return width >= height ? { width: Math.min(edge, width) } : { height: Math.min(edge, height) };
};

/**
 * Takes or chooses a photo of any size (48 MP camera shots, HEIC, screenshots) and returns
 * a sharp JPEG file on the phone, ready to upload. Nothing is ever rejected for being too big.
 */
export async function pickPhotoFile(source: "camera" | "library"): Promise<string | null> {
  const asset = await choose(source);
  if (!asset) return null;
  const image = await manipulateAsync(asset.uri, [{ resize: fit(asset, 2400) }], { compress: 0.85, format: SaveFormat.JPEG });
  return image.uri;
}

/**
 * Takes or chooses a photo and returns it as a JPEG data URL no longer than `maxLength`.
 * Large photos are scaled down step by step until they fit, so any photo works.
 */
export async function pickPhoto(source: "camera" | "library", maxLength = 900_000): Promise<string | null> {
  const asset = await choose(source);
  if (!asset) return null;
  let edge = 1600;
  let quality = 0.8;
  for (;;) {
    const image = await manipulateAsync(asset.uri, [{ resize: fit(asset, edge) }], { compress: quality, format: SaveFormat.JPEG, base64: true });
    const data = `data:image/jpeg;base64,${image.base64}`;
    if (data.length <= maxLength || edge <= 320) return data;
    edge = Math.round(edge * 0.8);
    quality = Math.max(0.45, quality - 0.08);
  }
}
