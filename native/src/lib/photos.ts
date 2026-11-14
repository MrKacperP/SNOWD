import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";

/** Explains why access is needed and offers a straight path to the app's page in Settings. */
function askForSettings(title: string, message: string) {
  Alert.alert(title, message, [
    { text: "Not now", style: "cancel" },
    { text: "Open Settings", onPress: () => void Linking.openSettings() },
  ]);
}

async function choose(source: "camera" | "library") {
  if (source === "camera") {
    let permission = await ImagePicker.getCameraPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      askForSettings("Camera access is off", "Turn on Camera for SNOWD in Settings to take photos.");
      return null;
    }
  }
  // The system photo picker runs outside the app, so choosing from the library needs no permission
  // at all, and works the same whether someone shared all, some or none of their photos.
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 1,
    exif: false,
    // Hands back a JPEG instead of HEIC where the phone can, so there's nothing to convert.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0] || null;
}

const fit = (asset: ImagePicker.ImagePickerAsset, edge: number) => {
  const { width = edge, height = edge } = asset;
  return width >= height ? { width: Math.min(edge, width) } : { height: Math.min(edge, height) };
};

const isJpeg = (asset: ImagePicker.ImagePickerAsset) => /jpe?g/i.test(asset.mimeType || "") || /\.jpe?g$/i.test(asset.fileName || asset.uri);

/**
 * Takes or chooses a photo of any size (48 MP camera shots, HEIC, panoramas, screenshots) and
 * returns a JPEG file on the phone, ready to upload. Nothing is ever rejected for being too big.
 * By default the photo keeps its full resolution; pass `maxEdge` for small things like avatars.
 */
export async function pickPhotoFile(source: "camera" | "library", maxEdge?: number): Promise<string | null> {
  const asset = await choose(source);
  if (!asset) return null;
  // A full-size JPEG goes up as is: re-encoding a huge photo can run the phone out of memory.
  if (!maxEdge && isJpeg(asset)) return asset.uri;
  try {
    // Re-encoding turns HEIC/PNG into JPEG, which every browser and phone can show.
    const image = await manipulateAsync(asset.uri, maxEdge ? [{ resize: fit(asset, maxEdge) }] : [], { compress: 0.9, format: SaveFormat.JPEG });
    return image.uri;
  } catch {
    // Too big to convert at full size: send it at a still-sharp 4096 px instead of failing.
    const image = await manipulateAsync(asset.uri, [{ resize: fit(asset, maxEdge || 4096) }], { compress: 0.9, format: SaveFormat.JPEG });
    return image.uri;
  }
}
