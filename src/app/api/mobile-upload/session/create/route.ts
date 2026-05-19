import { NextResponse } from "next/server";
import { createUploadSession } from "@/lib/mobileUploadSessions";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { sessionId, expiresAt } = createUploadSession();
    return NextResponse.json({ sessionId, expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
