import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  let uid: string;
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) throw new Error("Missing token");
    uid = (await getAdminAuth().verifyIdToken(token, true)).uid;
  } catch {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  let chatId: unknown;
  let message: unknown;
  let senderName: unknown;
  try {
    ({ chatId, message, senderName } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    typeof chatId !== "string" || !chatId || chatId.includes("/") ||
    typeof message !== "string" || !message.trim()
  ) {
    return NextResponse.json({ error: "Invalid message notification." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const chat = (await db.doc(`chats/${chatId}`).get()).data();
    const participants = Array.isArray(chat?.participants) ? chat.participants : [];
    const recipient = participants.find((participant): participant is string => participant !== uid && typeof participant === "string");
    if (!participants.includes(uid) || !recipient) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 403 });
    }

    await db.collection("notifications").add({
      uid: recipient,
      type: "message",
      title: `New message from ${typeof senderName === "string" && senderName.trim() ? senderName.trim() : "your contact"}`,
      message: message.trim().slice(0, 240),
      preview: message.trim().slice(0, 240),
      chatId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Message notification failed:", error);
    return NextResponse.json({ error: "Could not create message notification." }, { status: 500 });
  }
}
