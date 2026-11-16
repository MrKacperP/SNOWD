import type { CameraView } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode as decodeJpeg } from "jpeg-js";
import { readImage } from "./penguinCode";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Uint8Array(128);
for (let i = 0; i < B64.length; i++) LOOKUP[B64.charCodeAt(i)] = i;

function fromBase64(s: string) {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (LOOKUP[clean.charCodeAt(i)] << 18) | (LOOKUP[clean.charCodeAt(i + 1)] << 12) | (LOOKUP[clean.charCodeAt(i + 2)] << 6) | LOOKUP[clean.charCodeAt(i + 3)];
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

/**
 * Takes one quiet, small photo with the camera and looks for a SNOWD penguin code in it.
 * Returns the person's id, or "" when there isn't one in view.
 */
export async function scanPenguinCode(camera: CameraView): Promise<string> {
  const photo = await camera.takePictureAsync({ quality: 0.5, skipProcessing: true, shutterSound: false });
  if (!photo?.uri) return "";
  const ctx = ImageManipulator.manipulate(photo.uri);
  ctx.resize({ width: 480 });
  const image = await ctx.renderAsync();
  const small = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  if (!small.base64) return "";
  const { data, width, height } = decodeJpeg(fromBase64(small.base64), { useTArray: true, formatAsRGBA: true });
  return readImage(data, width, height);
}
