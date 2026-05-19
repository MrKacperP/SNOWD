import crypto from "node:crypto";

type UploadSession = {
  expiresAt: number;
  imageDataUrl?: string;
};

const sessions = new Map<string, UploadSession>();

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [key, value] of sessions.entries()) {
    if (value.expiresAt <= now) {
      sessions.delete(key);
    }
  }
}

export function createUploadSession(ttlMs = 10 * 60 * 1000): { sessionId: string; expiresAt: number } {
  cleanupExpiredSessions();

  const sessionId = crypto.randomBytes(24).toString("base64url");
  const expiresAt = Date.now() + ttlMs;

  sessions.set(sessionId, { expiresAt });
  return { sessionId, expiresAt };
}

export function uploadToSession(sessionId: string, imageDataUrl: string): { ok: true } {
  cleanupExpiredSessions();
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error("Upload session not found or expired");
  }

  if (session.imageDataUrl) {
    throw new Error("This upload link was already used");
  }

  session.imageDataUrl = imageDataUrl;
  sessions.set(sessionId, session);
  return { ok: true };
}

export function consumeSessionUpload(sessionId: string): { imageDataUrl?: string; pending: boolean } {
  cleanupExpiredSessions();
  const session = sessions.get(sessionId);
  if (!session) {
    return { pending: false };
  }

  if (!session.imageDataUrl) {
    return { pending: true };
  }

  const imageDataUrl = session.imageDataUrl;
  sessions.delete(sessionId);
  return { imageDataUrl, pending: false };
}
