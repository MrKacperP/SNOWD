import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { sendWelcomeEmail } from "@/lib/emailNotifications";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const { uid } = await getAdminAuth().verifyIdToken(token, true);
    const result = await sendWelcomeEmail(uid);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Welcome email failed", error);
    return NextResponse.json({ error: "Welcome email could not be sent." }, { status: 500 });
  }
}
