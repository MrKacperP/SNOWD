import { NextRequest, NextResponse } from "next/server";
import { uploadToSession } from "@/lib/mobileUploadSessions";

export const runtime = "nodejs";

function isSupportedImageDataUrl(value: string): boolean {
  return /^data:image\/(png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { sessionId?: string; imageDataUrl?: string };
    const sessionId = body.sessionId?.trim();
    const imageDataUrl = body.imageDataUrl?.trim();

    if (!sessionId || !imageDataUrl) {
      return NextResponse.json({ error: "Missing sessionId or imageDataUrl" }, { status: 400 });
    }

    if (!isSupportedImageDataUrl(imageDataUrl)) {
      return NextResponse.json({ error: "Unsupported image format" }, { status: 400 });
    }

    if (imageDataUrl.length > 2_500_000) {
      return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    }

    uploadToSession(sessionId, imageDataUrl);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("already used") ? 409 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
