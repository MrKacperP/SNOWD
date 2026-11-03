import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/**
 * Lets the user take or choose a photo and returns it as a compact JPEG data URL,
 * the same format the website stores for chat and completion photos.
 */
export async function pickPhoto(source: "camera" | "library", maxLength = 900_000): Promise<string | null> {
  const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error(source === "camera" ? "Allow camera access in Settings to take a photo." : "Allow photo access in Settings to choose a photo.");
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  let edge = 1600;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { width = edge, height = edge } = result.assets[0];
    const resize = width >= height ? { width: Math.min(edge, width) } : { height: Math.min(edge, height) };
    const image = await manipulateAsync(result.assets[0].uri, [{ resize }], { compress: 0.78 - attempt * 0.1, format: SaveFormat.JPEG, base64: true });
    const data = `data:image/jpeg;base64,${image.base64}`;
    if (data.length <= maxLength) return data;
    edge *= 0.75;
  }
  throw new Error("This photo couldn’t be made small enough to send.");
}
