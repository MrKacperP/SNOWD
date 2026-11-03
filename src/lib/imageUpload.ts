const WEB_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PASSTHROUGH_BYTES = 1.5 * 1024 * 1024;

export const IMAGE_ACCEPT = "image/*";

function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This photo format cannot be opened. Choose a JPEG or PNG, or take a new photo."));
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

function encode(img: HTMLImageElement, maxEdge: number, quality: number): Promise<Blob> {
  const ratio = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare this photo.");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Your browser could not prepare this photo.")), "image/jpeg", quality));
}

/**
 * Turns any photo the phone or camera produces (full-resolution JPEG, HEIC, large PNG) into an
 * upload-ready JPEG no larger than `maxEdge` pixels on its longest side. Small web images pass through untouched.
 */
export async function prepareImageUpload(file: File, maxEdge = 2400): Promise<File> {
  if (file.type && !file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (WEB_TYPES.includes(file.type) && file.size <= PASSTHROUGH_BYTES) return file;
  let img: HTMLImageElement;
  try { img = await loadImage(file); }
  catch (error) { if (WEB_TYPES.includes(file.type)) return file; throw error; }
  const blob = await encode(img, maxEdge, 0.85);
  const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

/** Same as prepareImageUpload but returns a JPEG data URL kept under `maxLength` characters (for Firestore-stored images). */
export async function prepareImageDataUrl(file: File, maxLength = 900_000): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) throw new Error("Choose an image file.");
  const img = await loadImage(file);
  let edge = 1600;
  for (let attempt = 0; attempt < 6; attempt++) {
    const blob = await encode(img, edge, 0.82 - attempt * 0.08);
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read this photo."));
      reader.readAsDataURL(blob);
    });
    if (data.length <= maxLength) return data;
    edge *= 0.75;
  }
  throw new Error("This photo could not be made small enough to send.");
}
