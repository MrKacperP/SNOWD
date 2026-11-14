import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import { storage } from "./firebase";
import { pickPhotoFile } from "./photos";

/**
 * Reads a file:// (or data:) URI into a native Blob through React Native's networking layer.
 * Firebase's uploadString builds its upload from raw bytes, which React Native's Blob can't hold,
 * and the native Blob streams large files without loading them into JavaScript memory.
 */
function readBlob(uri: string) {
  return new Promise<Blob>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => resolve(request.response as Blob);
    request.onerror = () => reject(new Error("Couldn’t read that file. Try another one."));
    request.responseType = "blob";
    request.open("GET", uri, true);
    request.send(null);
  });
}

export type UploadOptions = { name?: string; contentType?: string; onProgress?: (fraction: number) => void };

/**
 * Uploads a file from the phone to Firebase Storage and returns its download URL.
 * Uses a resumable upload, so photos and documents of any size go up in chunks and survive a
 * brief drop in signal; `onProgress` reports 0–1 for a progress bar.
 */
export async function uploadFile(folder: string, uri: string, options: UploadOptions = {}) {
  const contentType = options.contentType || "image/jpeg";
  const file = ref(storage, `${folder}/${options.name || `${Crypto.randomUUID()}${contentType === "image/jpeg" ? ".jpg" : ""}`}`);
  const blob = await readBlob(uri);
  try {
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(file, blob, { contentType });
      task.on("state_changed", (snap) => options.onProgress?.(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0), reject, () => resolve());
    });
  } catch (e) {
    const code = (e as { code?: string }).code || "";
    throw new Error(code === "storage/unauthorized" ? "SNOWD couldn’t accept that upload. Try again in a moment; if it keeps happening, let us know." : "The upload didn’t finish. Check your connection and try again.");
  } finally {
    (blob as Blob & { close?: () => void }).close?.();
  }
  return getDownloadURL(file);
}

export type PickedFile = { uri: string; name: string; size?: number; mimeType: string };

/** Opens the Files picker for any document (PDF, Word, video…), of any size. */
export async function pickDocument(types: string[] = ["*/*"]): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.name || "File", size: asset.size, mimeType: asset.mimeType || "application/octet-stream" };
}

/** A safe file name for Storage: keeps the extension, drops anything odd. */
export const storageName = (name: string) => `${Crypto.randomUUID()}-${name.replace(/[^\w.\-]+/g, "_").slice(-80)}`;

type Choice = { kind: "photo"; uri: string } | { kind: "file"; file: PickedFile };

/**
 * Asks "Take photo / Choose from library" (and "Choose a file" when `files` is set), then returns
 * what was picked, or null if cancelled. Photos come back as full-size JPEG files.
 */
export function chooseUpload(title?: string, { files, maxEdge }: { files?: boolean; maxEdge?: number } = {}): Promise<Choice | null> {
  return new Promise((resolve, reject) => {
    const photo = (source: "camera" | "library") => pickPhotoFile(source, maxEdge).then((uri) => resolve(uri ? { kind: "photo", uri } : null), reject);
    const doc = () => pickDocument().then((file) => resolve(file ? { kind: "file", file } : null), reject);
    const options = ["Take photo", "Choose from library", ...(files ? ["Choose a file"] : []), "Cancel"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title, options, cancelButtonIndex: options.length - 1 }, (i) => {
        if (i === 0) void photo("camera");
        else if (i === 1) void photo("library");
        else if (files && i === 2) void doc();
        else resolve(null);
      });
    } else {
      Alert.alert(title || "Add a photo", undefined, [
        { text: "Take photo", onPress: () => void photo("camera") },
        { text: "Choose from library", onPress: () => void photo("library") },
        ...(files ? [{ text: "Choose a file", onPress: () => void doc() }] : []),
        { text: "Cancel", style: "cancel" as const, onPress: () => resolve(null) },
      ]);
    }
  });
}

/** Asks for a photo and uploads it full size to `folder`, returning its URL (or null if cancelled). */
export async function chooseAndUploadPhoto(folder: string, title?: string, options: { maxEdge?: number; name?: string; onProgress?: (f: number) => void } = {}) {
  const picked = await chooseUpload(title, { maxEdge: options.maxEdge });
  if (!picked || picked.kind !== "photo") return null;
  return uploadFile(folder, picked.uri, { name: options.name, onProgress: options.onProgress });
}
