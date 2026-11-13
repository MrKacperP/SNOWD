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
 * Takes or chooses a photo of any size (48 MP camera shots, HEIC, panoramas, screenshots) and
 * returns a JPEG file on the phone, ready to upload. Nothing is ever rejected for being too big.
 * By default the photo keeps its full resolution; pass `maxEdge` for small things like avatars.
 */
export async function pickPhotoFile(source: "camera" | "library", maxEdge?: number): Promise<string | null> {
  const asset = await choose(source);
  if (!asset) return null;
  // Re-encoding turns HEIC into JPEG, which every browser and phone can show.
  const image = await manipulateAsync(asset.uri, maxEdge ? [{ resize: fit(asset, maxEdge) }] : [], { compress: 0.9, format: SaveFormat.JPEG });
  return image.uri;
}
