import * as Crypto from "expo-crypto";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import { storage } from "./firebase";
import { pickPhoto } from "./photos";

/**
 * Turns a data URL into a native Blob through React Native's networking layer.
 * Firebase's uploadString builds its upload from raw bytes, which React Native's Blob
 * can't hold ("Creating blobs from ArrayBuffer ... not supported"), so it always failed here.
 */
function dataUrlToBlob(dataUrl: string) {
  // Also reads file:// URIs, which is how full-size photos are uploaded.
  return new Promise<Blob>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => resolve(request.response as Blob);
    request.onerror = () => reject(new Error("Couldn’t read that photo. Try another one."));
    request.responseType = "blob";
    request.open("GET", dataUrl, true);
    request.send(null);
  });
}

/** Uploads a photo file from the phone (see pickPhotoFile) to Firebase Storage and returns its download URL. */
export async function uploadFile(folder: string, uri: string, name = `${Crypto.randomUUID()}.jpg`) {
  const file = ref(storage, `${folder}/${name}`);
  const blob = await dataUrlToBlob(uri);
  try {
    await uploadBytes(file, blob, { contentType: "image/jpeg" });
  } catch (e) {
    const code = (e as { code?: string }).code || "";
    throw new Error(code === "storage/unauthorized" ? "You don’t have permission to upload here. Sign out and back in, then try again." : "The photo didn’t upload. Check your connection and try again.");
  } finally {
    (blob as Blob & { close?: () => void }).close?.();
  }
  return getDownloadURL(file);
}

/** Uploads a JPEG data URL to Firebase Storage and returns its public download URL. */
export async function uploadDataUrl(folder: string, dataUrl: string, name = Crypto.randomUUID()) {
  const file = ref(storage, `${folder}/${name}`);
  const blob = await dataUrlToBlob(dataUrl);
  try {
    await uploadBytes(file, blob, { contentType: "image/jpeg" });
  } catch (e) {
    const code = (e as { code?: string }).code || "";
    throw new Error(code === "storage/unauthorized" ? "You don’t have permission to upload here. Sign out and back in, then try again." : "The photo didn’t upload. Check your connection and try again.");
  } finally {
    (blob as Blob & { close?: () => void }).close?.();
  }
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
