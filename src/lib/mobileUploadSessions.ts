import crypto from "node:crypto";
import { getAdminDb } from "@/lib/firebaseAdmin";

type UploadSession = {
  expiresAt: number;
  imageDataUrl?: string;
};

const collectionName = "mobileUploadSessions";

export async function createUploadSession(ttlMs = 10 * 60 * 1000): Promise<{ sessionId: string; expiresAt: number }> {

  const sessionId = crypto.randomBytes(24).toString("base64url");
  const expiresAt = Date.now() + ttlMs;

  await getAdminDb().collection(collectionName).doc(sessionId).create({ expiresAt });
  return { sessionId, expiresAt };
}

export async function uploadToSession(sessionId: string, imageDataUrl: string): Promise<{ ok: true }> {
  const db = getAdminDb();
  const sessionRef = db.collection(collectionName).doc(sessionId);
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    const session = snapshot.data() as UploadSession | undefined;

    if (!session || session.expiresAt <= Date.now()) {
      throw new Error("Upload session not found or expired");
    }

    if (session.imageDataUrl) {
      throw new Error("This upload link was already used");
    }

    transaction.update(sessionRef, { imageDataUrl });
    return { ok: true as const };
  });
  return result;
}

export async function consumeSessionUpload(sessionId: string): Promise<{ imageDataUrl?: string; pending: boolean }> {
  const db = getAdminDb();
  const sessionRef = db.collection(collectionName).doc(sessionId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    const session = snapshot.data() as UploadSession | undefined;
    if (!session || session.expiresAt <= Date.now()) {
      if (snapshot.exists) transaction.delete(sessionRef);
      return { pending: false };
    }

    if (!session.imageDataUrl) {
      return { pending: true };
    }

    transaction.delete(sessionRef);
    return { imageDataUrl: session.imageDataUrl, pending: false };
  });
}
