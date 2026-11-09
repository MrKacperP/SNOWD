import * as Crypto from "expo-crypto";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import { storage } from "./firebase";
import { pickPhoto } from "./photos";

/** Uploads a JPEG data URL to Firebase Storage and returns its public download URL. */
export async function uploadDataUrl(folder: string, dataUrl: string, name = Crypto.randomUUID()) {
  const file = ref(storage, `${folder}/${name}`);
  await uploadString(file, dataUrl, "data_url", { contentType: "image/jpeg" });
  return getDownloadURL(file);
}

/** Asks "Take photo / Choose from library", then returns a compact JPEG data URL (or null if cancelled). */
export function choosePhoto(title?: string, maxLength?: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const run = (source: "camera" | "library") => pickPhoto(source, maxLength).then(resolve, reject);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title, options: ["Take photo", "Choose from library", "Cancel"], cancelButtonIndex: 2 }, (i) => {
        if (i === 0) void run("camera");
        else if (i === 1) void run("library");
        else resolve(null);
      });
    } else {
      Alert.alert(title || "Add a photo", undefined, [
        { text: "Take photo", onPress: () => void run("camera") },
        { text: "Choose from library", onPress: () => void run("library") },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ]);
    }
  });
}
