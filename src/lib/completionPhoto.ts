export const MAX_PHOTO_LENGTH = 700000;
export function validCompletionPhoto(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_PHOTO_LENGTH &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export async function prepareCompletionPhoto(file: File): Promise<string> {
  if (file.size > 30 * 1024 * 1024) throw new Error("Choose a photo under 30 MB.");
  if (file.type && !file.type.startsWith("image/")) throw new Error("Choose an image file.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("This photo format cannot be opened. Choose a JPEG or PNG, or take a new photo."));
    });
    const canvas = document.createElement("canvas");
    let edge = 1600;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ratio = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare this photo.");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.8 - attempt * 0.1);
      if (validCompletionPhoto(data)) return data;
      edge *= 0.75;
    }
    throw new Error("Choose a smaller photo.");
  } finally { URL.revokeObjectURL(url); }
}
